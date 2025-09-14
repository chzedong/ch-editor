import { TypedEmitter } from 'tiny-typed-emitter';
import { cloneDeep } from 'lodash-es';
import {
  LifecycleHooks,
  BeforeUpdateBlockContext,
  BeforeInsertBlockContext,
  BeforeDeleteBlockContext,
  BeforeInsertBoxContext,
  BeforeDeleteBoxContext,
  DocChangeContext
} from '../doc/hooks';
import { SelectionRangeSnapshot } from '../selection/selection-range';
import { Editor } from '../editor/editor';
import { DocBlock } from '../index.type';
import { MergeStrategyManager, MergeContext } from './merge-strategy';
import { assert } from '../utils/assert';

/**
 * SnapshotCollector事件接口
 */
interface SnapshotCollectorEvents {
  snapshot: (snapshot: OperationSnapshot) => void;
  snapshotMerged: (mergedSnapshot: OperationSnapshot, originalSnapshot: OperationSnapshot) => void;
}

// 操作快照接口
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

// 快照收集器类
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

  /**
   * 注册所有相关的生命周期钩子
   */
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

  // Before钩子处理函数
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
    this.createOperationSnapshot('update', context); // Box操作实际上是文本更新
  }

  private handleBeforeBoxDelete(context: BeforeDeleteBoxContext): void {
    this.createOperationSnapshot('update', context); // Box操作实际上是文本更新
  }

  /**
   * 创建操作快照的通用方法
   */
  private createOperationSnapshot(
    type: 'update' | 'insert' | 'delete',
    context: { containerId: string; blockIndex: number },
    blockData?: DocBlock
  ): void {
    const { containerId, blockIndex } = context;
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

  // DocChange钩子处理函数 - 统一处理所有操作的后置逻辑
  private handleDocChange(context: DocChangeContext): void {
    if (!this.currentOperation) {
      return;
    }

    // 根据操作类型设置afterBlock和afterSelection
    if (context.type === 'update' || context.type === 'insert' || context.type === 'insertBox') {
      const block = this.editor.editorDoc.getBlockByIndex(context.containerId, context.blockIndex);
      this.currentOperation.afterBlock = cloneDeep(block);
    }

    this.currentOperation.afterSelection = this.editor.selection.range.toJSON();

    // 保存快照
    this.saveSnapshot(this.currentOperation as OperationSnapshot);
  }

  /**
   * 保存快照
   */
  private saveSnapshot(snapshot: OperationSnapshot): void {
    // 尝试与上一个快照合并
    const mergedSnapshot = this.tryMergeWithLastSnapshot(snapshot);

    // 限制快照数量，移除最旧的快照
    if (this.operationSnapshots.length > this.maxSnapshotCount) {
      this.operationSnapshots.shift();
    }

    // 更新操作快照数组中的最后一个快照
    if (mergedSnapshot) {
      this.operationSnapshots[this.operationSnapshots.length - 1] = mergedSnapshot;
      // 发布合并事件
      const lastSnapshot = this.getLastSnapshot();
      assert(lastSnapshot, 'lastSnapshot should exist');
      this.emit('snapshotMerged', mergedSnapshot, lastSnapshot);
    } else {
      this.operationSnapshots.push(snapshot);
      // 发布快照事件
      this.emit('snapshot', snapshot);
    }

    // 清空当前操作
    this.currentOperation = null;
  }

  /**
   * 尝试与上一个快照合并
   */
  private tryMergeWithLastSnapshot(currentSnapshot: OperationSnapshot): OperationSnapshot | null {

    const lastSnapshot = this.getLastSnapshot();

    if (!lastSnapshot) {
      return null;
    }

    // 构建合并上下文
    const mergeContext: MergeContext = {
      editor: this.editor,
      currentSnapshot,
      previousSnapshot: lastSnapshot,
      imeState: this.editor.input.getCompositionState()
    };

    // 评估是否应该合并
    const mergeResult = this.mergeStrategyManager.evaluateMerge(mergeContext);

    if (mergeResult.mergedSnapshot) {
      return mergeResult.mergedSnapshot;
    }

    return null;
  }

  /**
   * 获取合并策略管理器
   */
  getMergeStrategyManager(): MergeStrategyManager {
    return this.mergeStrategyManager;
  }

  /**
   * 获取最后一个快照
   */
  getLastSnapshot(): OperationSnapshot | null {
    return this.operationSnapshots[this.operationSnapshots.length - 1] || null;
  }

  /**
   * 获取快照数量
   */
  getSnapshotCount(): number {
    return this.operationSnapshots.length;
  }

  /**
   * 销毁收集器，取消所有钩子注册
   */
  destroy(): void {
    this.unregisterCallbacks.forEach((unregister) => unregister());
    this.unregisterCallbacks = [];
    this.operationSnapshots = [];
    this.currentOperation = null;
  }
}
