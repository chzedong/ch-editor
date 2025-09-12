import { LifecycleHooks, BeforeUpdateBlockContext, BeforeInsertBlockContext, BeforeDeleteBlockContext, BeforeInsertBoxContext, BeforeDeleteBoxContext, DocChangeContext } from '../doc/hooks';
import { SelectionRangeSnapshot } from '../selection/selection-range';
import { Editor } from '../main';
import { DocBlock } from '../index.type';
import { cloneDeep } from 'lodash-es';

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
export class SnapshotCollector {
  private operationSnapshots: OperationSnapshot[] = [];
  private maxSnapshotCount: number = 100;
  private currentOperation: Partial<OperationSnapshot> | null = null;
  private unregisterCallbacks: (() => void)[] = [];

  constructor(private editor: Editor, private hooks: LifecycleHooks) {
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
    this.operationSnapshots.push(snapshot);

    // 限制快照数量，移除最旧的快照
    if (this.operationSnapshots.length > this.maxSnapshotCount) {
      this.operationSnapshots.shift();
    }

    // 清空当前操作
    this.currentOperation = null;
  }

  /**
   * 销毁收集器，取消所有钩子注册
   */
  destroy(): void {
    this.unregisterCallbacks.forEach(unregister => unregister());
    this.unregisterCallbacks = [];
    this.operationSnapshots = [];
    this.currentOperation = null;
  }
}
