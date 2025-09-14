import { OperationSnapshot } from './snapshot-collector';
import { Editor } from '../editor/editor';

/**
 * 合并上下文接口 - 提供合并决策所需的上下文信息
 */
export interface MergeContext {
  /** 编辑器实例 */
  editor: Editor;
  /** 当前快照 */
  currentSnapshot: OperationSnapshot;
  /** 上一个快照 */
  previousSnapshot: OperationSnapshot;
  /** IME合成状态 */
  imeState?: {
    isComposing: boolean;
    compositionText: string;
  };
  /** 输入事件类型 */
  inputType?: string;
}

/**
 * 合并结果接口
 */
export interface MergeResult {
  /** 是否应该合并 */
  shouldMerge: boolean;
  /** 合并后的快照（如果需要合并） */
  mergedSnapshot?: OperationSnapshot;
  // 是否熔断
  isFuse?: boolean;
}

/**
 * 合并策略接口
 */
export interface IMergeStrategy {
  /**
   * 判断是否应该合并两个快照
   * @param context 合并上下文
   * @returns 合并结果
   */
  shouldMerge(context: MergeContext): MergeResult;

  /**
   * 策略名称
   */
  readonly name: string;

  /**
   * 策略优先级（数字越大优先级越高）
   */
  readonly priority: number;
}

/**
 * 抽象合并策略基类
 */
export abstract class BaseMergeStrategy implements IMergeStrategy {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract shouldMerge(context: MergeContext): MergeResult;

  /**
   * 检查两个快照是否为相同类型的文本更新操作
   */
  protected isTextUpdateOperation(snapshot1: OperationSnapshot, snapshot2: OperationSnapshot): boolean {
    return (
      snapshot1.type === 'update' &&
      snapshot2.type === 'update' &&
      snapshot1.containerId === snapshot2.containerId &&
      snapshot1.blockIndex === snapshot2.blockIndex
    );
  }

  /**
   * 检查两个快照的时间间隔
   */
  protected getTimeDifference(snapshot1: OperationSnapshot, snapshot2: OperationSnapshot): number {
    return Math.abs(snapshot2.timestamp - snapshot1.timestamp);
  }

  /**
   * 合并两个文本更新快照
   */
  protected mergeTextSnapshots(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): OperationSnapshot {
    return {
      ...currentSnapshot,
      beforeBlock: previousSnapshot.beforeBlock,
      beforeSelection: previousSnapshot.beforeSelection,
      timestamp: previousSnapshot.timestamp // 保持原始时间戳
    };
  }
}

/**
 * IME合成合并策略
 * IME输入过程中的操作会被合并
 */
export class IMEMergeStrategy extends BaseMergeStrategy {
  readonly name = 'ime';
  readonly priority = 20; // 比时间策略优先级更高

  shouldMerge(context: MergeContext): MergeResult {
    const { currentSnapshot, previousSnapshot, imeState } = context;

    // 检查是否为相同位置的文本更新操作
    if (!this.isTextUpdateOperation(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    // 如果当前正在IME合成中，应该合并?
    if (imeState?.compositionText) {
      // const mergedSnapshot = this.mergeTextSnapshots(previousSnapshot, currentSnapshot);
      return {
        shouldMerge: false,
        isFuse: true
        // mergedSnapshot
      };
    }

    return { shouldMerge: false, isFuse: false };
  }
}

/**
 * 连续字符合并策略
 * 连续的单字符输入会被合并（适用于英文输入）
 */
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

    // 检查是否为相同位置的文本更新操作
    if (!this.isTextUpdateOperation(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    // 检查时间间隔
    const timeDiff = this.getTimeDifference(previousSnapshot, currentSnapshot);
    if (timeDiff > this.timeThreshold) {
      return { shouldMerge: false, isFuse: true };
    }

    // 检查是否为连续的字符输入
    if (!this.isContinuousCharInput(previousSnapshot, currentSnapshot)) {
      return { shouldMerge: false, isFuse: true };
    }

    // 检查合并长度限制
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

  /**
   * 检查是否为连续的字符输入
   */
  private isContinuousCharInput(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): boolean {
    // 这里可以根据具体的文本操作来判断
    // 简化实现：检查选区位置是否连续
    const prevSelection = previousSnapshot.afterSelection;
    const currSelection = currentSnapshot.beforeSelection;

    if (!prevSelection || !currSelection) {
      return false;
    }

    // 检查选区是否连续（当前操作的开始位置应该等于上一个操作的结束位置）
    return (
      prevSelection.focus.blockId === currSelection.anchor.blockId &&
      prevSelection.focus.offset === currSelection.anchor.offset
    );
  }

  /**
   * 估算合并后的文本长度
   */
  private estimateMergedLength(
    previousSnapshot: OperationSnapshot,
    currentSnapshot: OperationSnapshot
  ): number {
    // 简化实现：基于选区位置差异估算
    const prevSelection = previousSnapshot.afterSelection;
    const currSelection = currentSnapshot.afterSelection;

    if (!prevSelection || !currSelection) {
      return 0;
    }

    return Math.abs(currSelection.focus.offset - previousSnapshot.beforeSelection!.anchor.offset);
  }
}

/**
 * undoStack 为空时不应该合并
 */
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

/**
 * 合并策略管理器
 */
export class MergeStrategyManager {
  private strategies: IMergeStrategy[] = [];

  constructor() {
    // 注册默认策略
    this.registerStrategy(new EmptyUndoStackMergeStrategy());
    this.registerStrategy(new IMEMergeStrategy());
    this.registerStrategy(new ContinuousCharMergeStrategy());
  }

  /**
   * 注册合并策略
   */
  registerStrategy(strategy: IMergeStrategy): void {
    this.strategies.push(strategy);
    // 按优先级排序（优先级高的在前）
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 移除合并策略
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  /**
   * 获取所有策略
   */
  getStrategies(): IMergeStrategy[] {
    return [...this.strategies];
  }

  /**
   * 评估是否应该合并快照
   * @param context 合并上下文
   * @returns 合并结果
   */
  evaluateMerge(context: MergeContext) {
    // 按优先级顺序尝试每个策略
    for (const strategy of this.strategies) {
      const result = strategy.shouldMerge(context);
      if (result.isFuse) {
        return result;
      }
    }

    return { shouldMerge: false };
  }

  /**
   * 设置策略配置
   */
  configureStrategy(name: string, config: any): void {
    const strategy = this.strategies.find(s => s.name === name);
    if (strategy && 'configure' in strategy && typeof strategy.configure === 'function') {
      (strategy as any).configure(config);
    }
  }
}
