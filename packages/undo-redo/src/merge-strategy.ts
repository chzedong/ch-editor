import { Editor } from '@ch-editor/core';
import { OperationSnapshot } from './snapshot-collector';

export interface MergeContext {
  editor: Editor;
  currentSnapshot: OperationSnapshot;
  previousSnapshot: OperationSnapshot;
  imeState?: {
    isComposing: boolean;
    compositionText: string;
  };
  inputType?: string;
}

export interface MergeResult {
  shouldMerge: boolean;
  mergedSnapshot?: OperationSnapshot;
  isFuse?: boolean;
}

export interface IMergeStrategy {
  shouldMerge(context: MergeContext): MergeResult;
  readonly name: string;
  readonly priority: number;
}

export abstract class BaseMergeStrategy implements IMergeStrategy {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract shouldMerge(context: MergeContext): MergeResult;

  protected isTextUpdateOperation(snapshot1: OperationSnapshot, snapshot2: OperationSnapshot): boolean {
    return (
      snapshot1.type === 'update' &&
      snapshot2.type === 'update' &&
      snapshot1.containerId === snapshot2.containerId &&
      snapshot1.blockIndex === snapshot2.blockIndex
    );
  }

  protected getTimeDifference(snapshot1: OperationSnapshot, snapshot2: OperationSnapshot): number {
    return Math.abs(snapshot2.timestamp - snapshot1.timestamp);
  }

  protected mergeTextSnapshots(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): OperationSnapshot {
    return {
      ...currentSnapshot,
      beforeBlock: previousSnapshot.beforeBlock,
      beforeSelection: previousSnapshot.beforeSelection,
      timestamp: previousSnapshot.timestamp
    };
  }
}

export class IMEMergeStrategy extends BaseMergeStrategy {
  readonly name = 'ime';
  readonly priority = 20;

  shouldMerge(context: MergeContext): MergeResult {
    const { currentSnapshot, previousSnapshot, imeState } = context;

    if (!this.isTextUpdateOperation(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    if (imeState?.compositionText) {
      return {
        shouldMerge: false,
        isFuse: true
      };
    }

    return { shouldMerge: false, isFuse: false };
  }
}

export class ContinuousCharMergeStrategy extends BaseMergeStrategy {
  readonly name = 'continuousChar';
  readonly priority = 5;

  constructor(
    private maxMergeLength: number = 50,
    private timeThreshold: number = 2000
  ) {
    super();
  }

  shouldMerge(context: MergeContext): MergeResult {
    const { currentSnapshot, previousSnapshot } = context;

    if (!this.isTextUpdateOperation(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    const timeDiff = this.getTimeDifference(previousSnapshot, currentSnapshot);
    if (timeDiff > this.timeThreshold) {
      return { shouldMerge: false, isFuse: true };
    }

    if (!this.isContinuousCharInput(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    const mergedLength = this.estimateMergedLength(previousSnapshot, currentSnapshot);
    if (mergedLength > this.maxMergeLength) {
      return { shouldMerge: false, isFuse: true };
    }

    const mergedSnapshot = this.mergeTextSnapshots(previousSnapshot, currentSnapshot);

    return {
      shouldMerge: true,
      mergedSnapshot,
      isFuse: true
    };
  }

  private isContinuousCharInput(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): boolean {
    const prevSelection = previousSnapshot.afterSelection;
    const currSelection = currentSnapshot.beforeSelection;

    if (!prevSelection || !currSelection) {
      return false;
    }

    return (
      prevSelection.focus.blockId === currSelection.anchor.blockId &&
      prevSelection.focus.offset === currSelection.anchor.offset
    );
  }

  private estimateMergedLength(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): number {
    const prevSelection = previousSnapshot.afterSelection;
    const currSelection = currentSnapshot.afterSelection;

    if (!prevSelection || !currSelection) {
      return 0;
    }

    return Math.abs(currSelection.focus.offset - previousSnapshot.beforeSelection!.anchor.offset);
  }
}

export class EmptyUndoStackMergeStrategy extends BaseMergeStrategy {
  readonly name = 'emptyUndoStack';
  readonly priority = 100;

  shouldMerge(context: MergeContext): MergeResult {
    const { editor } = context;
    const { undoStackSize } = editor.undoManager.getState();

    if (undoStackSize === 0) {
      return { shouldMerge: false, isFuse: true };
    }

    return { shouldMerge: false, isFuse: false };
  }
}

export class MergeStrategyManager {
  private strategies: IMergeStrategy[] = [];

  constructor() {
    this.registerStrategy(new EmptyUndoStackMergeStrategy());
    this.registerStrategy(new IMEMergeStrategy());
    this.registerStrategy(new ContinuousCharMergeStrategy());
  }

  registerStrategy(strategy: IMergeStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter((s) => s.name !== name);
  }

  getStrategies(): IMergeStrategy[] {
    return [...this.strategies];
  }

  evaluateMerge(context: MergeContext) {
    let result: MergeResult = { shouldMerge: false };

    for (const strategy of this.strategies) {
      const currentResult = strategy.shouldMerge(context);
      if (currentResult.shouldMerge) {
        return currentResult;
      }
      if (currentResult.isFuse) {
        return result;
      }
      result = currentResult;
    }

    return result;
  }

  configureStrategy(name: string, config: any): void {
    const strategy = this.strategies.find((s) => s.name === name);
    if (!strategy) return;
    Object.assign(strategy as any, config);
  }
}
