import { TypedEmitter } from 'tiny-typed-emitter';
import { cloneDeep } from 'lodash-es';
import {
  LifecycleHooks,
  type BeforeUpdateBlockContext,
  type BeforeInsertBlockContext,
  type BeforeDeleteBlockContext,
  type BeforeInsertBoxContext,
  type BeforeDeleteBoxContext,
  type DocChangeContext,
  type BaseHookContext,
  type SelectionRangeSnapshot,
  Editor,
  type DocBlock,
  assert
} from '@ch-editor/core';
import { MergeStrategyManager, type MergeContext } from './merge-strategy';

interface SnapshotCollectorEvents {
  snapshot: (snapshot: OperationSnapshot) => void;
  snapshotMerged: (mergedSnapshot: OperationSnapshot, originalSnapshot: OperationSnapshot) => void;
}

export interface OperationSnapshot {
  type: 'update' | 'insert' | 'delete';
  containerId: string;
  blockIndex: number;
  beforeBlock?: DocBlock;
  afterBlock?: DocBlock;
  beforeSelection?: SelectionRangeSnapshot;
  afterSelection?: SelectionRangeSnapshot;
  timestamp: number;
}

export class SnapshotCollector extends TypedEmitter<SnapshotCollectorEvents> {
  private operationSnapshots: OperationSnapshot[] = [];
  private maxSnapshotCount: number = 100;
  private currentOperation: Partial<OperationSnapshot> | null = null;
  private unregisterCallbacks: (() => void)[] = [];
  private mergeStrategyManager: MergeStrategyManager;

  constructor(private editor: Editor, private hooks: LifecycleHooks) {
    super();
    this.mergeStrategyManager = new MergeStrategyManager();
    this.registerHooks();
  }

  private registerHooks(): void {
    this.unregisterCallbacks.push(
      this.hooks.register('beforeUpdateBlock', this.handleBeforeUpdate.bind(this)),
      this.hooks.register('beforeInsertBlock', this.handleBeforeInsert.bind(this)),
      this.hooks.register('beforeDeleteBlock', this.handleBeforeDelete.bind(this)),
      this.hooks.register('beforeInsertBox', this.handleBeforeBoxInsert.bind(this)),
      this.hooks.register('beforeDeleteBox', this.handleBeforeBoxDelete.bind(this)),
      this.hooks.register('docChange', this.handleDocChange.bind(this))
    );
  }

  private handleBeforeUpdate(context: BeforeUpdateBlockContext): void {
    this.createOperationSnapshot('update', context);
  }

  private handleBeforeInsert(context: BeforeInsertBlockContext): void {
    this.createOperationSnapshot('insert', context, context.blockData);
  }

  private handleBeforeDelete(context: BeforeDeleteBlockContext): void {
    this.createOperationSnapshot('delete', context);
  }

  private handleBeforeBoxInsert(context: BeforeInsertBoxContext): void {
    this.createOperationSnapshot('update', context);
  }

  private handleBeforeBoxDelete(context: BeforeDeleteBoxContext): void {
    this.createOperationSnapshot('update', context);
  }

  private createOperationSnapshot(
    type: 'update' | 'insert' | 'delete',
    context: BaseHookContext,
    blockData?: DocBlock
  ): void {
    const { containerId, blockIndex, source } = context;
    if (source === 'remote') return;

    let beforeBlock: DocBlock;
    if (type === 'insert' && blockData) {
      beforeBlock = cloneDeep(blockData);
    } else {
      const block = this.editor.editorDoc.getBlockByIndex(containerId, blockIndex);
      beforeBlock = cloneDeep(block);
    }

    this.currentOperation = {
      type,
      containerId,
      blockIndex,
      beforeBlock,
      beforeSelection: this.editor.selection.range.toJSON(),
      timestamp: Date.now()
    };
  }

  private handleDocChange(context: DocChangeContext): void {
    if (!this.currentOperation) {
      return;
    }

    if (context.type === 'update' || context.type === 'insert' || context.type === 'insertBox') {
      const block = this.editor.editorDoc.getBlockByIndex(context.containerId, context.blockIndex);
      this.currentOperation.afterBlock = cloneDeep(block);
    }

    this.currentOperation.afterSelection = this.editor.selection.range.toJSON();
    this.saveSnapshot(this.currentOperation as OperationSnapshot);
  }

  private saveSnapshot(snapshot: OperationSnapshot): void {
    const mergedSnapshot = this.tryMergeWithLastSnapshot(snapshot);

    if (this.operationSnapshots.length > this.maxSnapshotCount) {
      this.operationSnapshots.shift();
    }

    if (mergedSnapshot) {
      this.operationSnapshots[this.operationSnapshots.length - 1] = mergedSnapshot;
      const lastSnapshot = this.getLastSnapshot();
      assert(lastSnapshot, 'lastSnapshot should exist');
      this.emit('snapshotMerged', mergedSnapshot, lastSnapshot);
    } else {
      this.operationSnapshots.push(snapshot);
      this.emit('snapshot', snapshot);
    }

    this.currentOperation = null;
  }

  private tryMergeWithLastSnapshot(currentSnapshot: OperationSnapshot): OperationSnapshot | null {
    const lastSnapshot = this.getLastSnapshot();
    if (!lastSnapshot) {
      return null;
    }

    const mergeContext: MergeContext = {
      editor: this.editor,
      currentSnapshot,
      previousSnapshot: lastSnapshot,
      imeState: this.editor.input.getCompositionState()
    };

    const mergeResult = this.getMergeStrategyManager().evaluateMerge(mergeContext);
    if (mergeResult.mergedSnapshot) {
      return mergeResult.mergedSnapshot;
    }
    return null;
  }

  getMergeStrategyManager(): MergeStrategyManager {
    return this.mergeStrategyManager;
  }

  getLastSnapshot(): OperationSnapshot | null {
    return this.operationSnapshots[this.operationSnapshots.length - 1] || null;
  }

  getSnapshotCount(): number {
    return this.operationSnapshots.length;
  }

  destroy(): void {
    this.unregisterCallbacks.forEach((unregister) => unregister());
    this.unregisterCallbacks = [];
    this.operationSnapshots = [];
    this.currentOperation = null;
  }
}