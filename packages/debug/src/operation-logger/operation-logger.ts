import { assert, Editor } from '@ch-editor/core';
import { HookContextMap } from '@ch-editor/core';
import { createSignal } from 'solid-js';
import {
  OperationType,
  OperationSource,
  OperationRecord,
  BaseOperationRecord,
  BlockOperationRecord,
  BoxOperationRecord,
  SelectionOperationRecord,
  InteractionOperationRecord,
  OperationLoggerConfig,
  OperationFilter,
  OperationStats
} from './types';

/**
 * 操作记录器类
 * 负责监听编辑器事件并记录用户操作
 */
export class OperationLogger {
  private records: OperationRecord[] = [];
  private recordsSignal: () => OperationRecord[];
  private setRecords: (records: OperationRecord[]) => void;
  private unregisterCallbacks: (() => void)[] = [];
  private operationIdCounter = 0;
  private cleanupTimer?: number;
  private isRecordingFlag = false;
  private editor?: Editor;

  constructor(
    private config: OperationLoggerConfig = {
      maxRecords: 1000,
      captureStackTrace: false,
      enablePerformanceMonitoring: true,
      autoCleanupInterval: 60000 // 1分钟
    }
  ) {
    const [recordsSignal, setRecords] = createSignal<OperationRecord[]>([]);
    this.recordsSignal = recordsSignal;
    this.setRecords = setRecords;
    this.startAutoCleanup();
  }

  /**
   * 获取操作记录的响应式信号
   */
  getRecordsSignal(): OperationRecord[] {
    return this.recordsSignal();
  }

  /**
   * 开始记录操作
   */
  startRecording(editor: Editor): void {
    if (this.isRecordingFlag) {
      console.warn('OperationLogger is already recording');
      return;
    }

    this.isRecordingFlag = true;
    this.editor = editor;
    this.setupEventListeners(editor);
  }

  /**
   * 停止记录操作
   */
  stopRecording(): void {
    if (!this.isRecordingFlag) {
      return;
    }

    this.isRecordingFlag = false;
    this.editor = undefined;
    this.unregisterCallbacks.forEach((unregister) => unregister());
    this.unregisterCallbacks = [];
  }

  /**
   * 检查是否正在记录
   */
  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(editor: Editor): void {
    // 监听文档变化事件
    this.unregisterCallbacks.push(
      editor.editorDoc.hooks.register('beforeDeleteBlock', this.handleBeforeDeleteBlock),
      editor.editorDoc.hooks.register('beforeInsertBlock', this.handleBeforeInsertBlock),
      editor.editorDoc.hooks.register('beforeUpdateBlock', this.handleBeforeUpdateBlock),
      editor.editorDoc.hooks.register('beforeInsertBox', this.handleBeforeInsertBox),
      editor.editorDoc.hooks.register('beforeDeleteBox', this.handleBeforeDeleteBox)
    );

    // 监听选区变化事件
    const selectionChangeHandler = this.handleSelectionChange.bind(this);
    editor.on('selectionChange', selectionChangeHandler);

    // 注册清理函数
    this.unregisterCallbacks.push(() => {
      editor.off('selectionChange', selectionChangeHandler);
    });

    // 监听DOM事件
    this.setupDOMEventListeners(editor);
  }

  /**
   * 处理文档变化事件
   */
  private handleBeforeDeleteBlock = (context: HookContextMap['beforeDeleteBlock']): void => {
    this.handleDocChange(context, OperationType.BLOCK_DELETE);
  };

  private handleBeforeInsertBlock = (context: HookContextMap['beforeInsertBlock']): void => {
    this.handleDocChange(context, OperationType.BLOCK_INSERT);
  };

  private handleBeforeUpdateBlock = (context: HookContextMap['beforeUpdateBlock']): void => {
    this.handleDocChange(context, OperationType.BLOCK_UPDATE);
  };

  private handleBeforeInsertBox = (context: HookContextMap['beforeInsertBox']): void => {
    this.handleDocChange(context, OperationType.BOX_INSERT);
  };

  private handleBeforeDeleteBox = (context: HookContextMap['beforeDeleteBox']): void => {
    this.handleDocChange(context, OperationType.BOX_DELETE);
  };

  // 键盘事件
  handleKeyDown = (editor: Editor, e: KeyboardEvent) => {
    this.recordInteractionOperation(editor, OperationType.KEY_PRESS, 'keydown', e);
    return false;
  };

  // 焦点事件
  handleFocus = (editor: Editor) => {
    this.recordSystemOperation(editor, OperationType.FOCUS);
    return false;
  };

  handleBlur = (editor: Editor) => {
    this.recordSystemOperation(editor, OperationType.BLUR);
    return false;
  };
  /**
   * 设置DOM事件监听器
   */
  private setupDOMEventListeners(editor: Editor): void {
    // 添加事件监听器
    editor.input.addHandler(this);

    // 注册清理函数
    this.unregisterCallbacks.push(() => {
      editor.input.removeHandler(this);
    });
  }

  /**
   * 处理文档变化事件
   */
  private handleDocChange(context: HookContextMap[keyof HookContextMap], type: OperationType): void {
    const timestamp = Date.now();
    const baseRecord: Omit<BaseOperationRecord, 'type'> = {
      id: this.generateOperationId(),
      timestamp,
      containerId: context.containerId,
      blockIndex: context.blockIndex,
      source: OperationSource.USER
    };

    let record: OperationRecord;

    switch (type) {
    case OperationType.BLOCK_INSERT:
      record = {
        ...baseRecord,
        beforeBlock: (context as HookContextMap['beforeInsertBlock']).blockData,
        type: OperationType.BLOCK_INSERT
      } as BlockOperationRecord;
      break;
    case OperationType.BLOCK_DELETE:
      record = {
        ...baseRecord,
        type: OperationType.BLOCK_DELETE
      } as BlockOperationRecord;
      break;
    case OperationType.BLOCK_UPDATE:
      record = {
        ...baseRecord,
        textActions: (context as HookContextMap['beforeUpdateBlock']).actions,
        type: OperationType.BLOCK_UPDATE
      } as BlockOperationRecord;
      break;
    case OperationType.BOX_INSERT:
      record = {
        ...baseRecord,
        beforeBoxData: (context as HookContextMap['beforeInsertBox']).boxData,
        offset: (context as HookContextMap['beforeInsertBox']).offset,
        type: OperationType.BOX_INSERT
      } as BoxOperationRecord;
      break;
    case OperationType.BOX_DELETE:
      record = {
        ...baseRecord,
        offset: (context as HookContextMap['beforeDeleteBox']).offset,
        type: OperationType.BOX_DELETE
      } as BoxOperationRecord;
      break;
    default:
      assert(false, 'Unknown operation type');
    }
    this.addRecord(record);
  }

  /**
   * 处理选区变化事件
   */
  private handleSelectionChange(editor: Editor): void {
    const focusBlock = editor.selection.range.focus.blockId;
    const containerId = editor.editorDoc.getContainerId(focusBlock);

    const record: SelectionOperationRecord = {
      id: this.generateOperationId(),
      type: OperationType.SELECTION_CHANGE,
      source: OperationSource.USER,
      timestamp: Date.now(),
      containerId: containerId,
      blockIndex: editor.editorDoc.getBlockIndexById(containerId, focusBlock),
      afterSelection: this.editor?.selection?.range?.toJSON() || undefined
    };

    this.addRecord(record);
  }

  /**
   * 记录交互操作
   */
  private recordInteractionOperation(
    editor: Editor,
    type: OperationType.MOUSE_CLICK | OperationType.KEY_PRESS,
    eventType: string,
    event: MouseEvent | KeyboardEvent
  ): void {
    Promise.resolve().then(() => {
      const focusBlock = editor.selection.range.focus.blockId;
      const containerId = editor.editorDoc.getContainerId(focusBlock);

      const record: InteractionOperationRecord = {
        id: this.generateOperationId(),
        type,
        source: OperationSource.USER,
        timestamp: Date.now(),
        containerId,
        blockIndex: editor.editorDoc.getBlockIndexById(containerId, focusBlock),
        eventType,
        eventData: this.extractEventData(event)
      };

      this.addRecord(record);
    });
  }

  /**
   * 记录系统操作
   */
  private recordSystemOperation(editor: Editor, type: OperationType.FOCUS | OperationType.BLUR): void {
    const focusBlock = editor.selection.range.focus.blockId;
    const containerId = editor.editorDoc.getContainerId(focusBlock);

    const record = {
      id: this.generateOperationId(),
      type,
      source: OperationSource.SYSTEM,
      timestamp: Date.now(),
      containerId,
      blockIndex: editor.editorDoc.getBlockIndexById(containerId, focusBlock)
    };

    this.addRecord(record);
  }

  /**
   * 添加操作记录
   */
  private addRecord(record: OperationRecord): void {
    // 应用过滤器
    if (this.config.filter && !this.matchesFilter(record, this.config.filter)) {
      return;
    }

    this.records.push(record);

    // 限制记录数量
    if (this.records.length > this.config.maxRecords) {
      this.records = this.records.slice(-this.config.maxRecords);
    }

    // 更新响应式信号
    this.setRecords([...this.records]);

  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${++this.operationIdCounter}_${Date.now()}`;
  }

  /**
   * 提取事件数据
   */
  private extractEventData(event: MouseEvent | KeyboardEvent): any {
    if (event instanceof MouseEvent) {
      return {
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      };
    } else if (event instanceof KeyboardEvent) {
      return {
        key: event.key,
        keyCode: event.keyCode,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      };
    }
    return {};
  }

  /**
   * 检查记录是否匹配过滤器
   */
  private matchesFilter(record: OperationRecord, filter: OperationFilter): boolean {
    if (filter.types && !filter.types.includes(record.type)) {
      return false;
    }

    if (filter.sources && !filter.sources.includes(record.source)) {
      return false;
    }

    if (filter.timeRange) {
      if (record.timestamp < filter.timeRange.start || record.timestamp > filter.timeRange.end) {
        return false;
      }
    }

    if (filter.containerId && record.containerId !== filter.containerId) {
      return false;
    }

    if (filter.blockId && record.blockId !== filter.blockId) {
      return false;
    }

    return true;
  }

  /**
   * 开始自动清理
   */
  private startAutoCleanup(): void {
    if (this.config.autoCleanupInterval > 0) {
      this.cleanupTimer = window.setInterval(() => {
        this.cleanup();
      }, this.config.autoCleanupInterval);
    }
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.autoCleanupInterval * 10; // 保留10个清理周期的数据

    this.records = this.records.filter((record) => {
      return now - record.timestamp < maxAge;
    });

    this.setRecords([...this.records]);
  }

  /**
   * 获取所有记录
   */
  getRecords(filter?: OperationFilter): OperationRecord[] {
    if (!filter) {
      return [...this.records];
    }

    return this.records.filter((record) => this.matchesFilter(record, filter));
  }

  /**
   * 获取操作统计
   */
  getStats(): OperationStats {
    const operationsByType = {} as Record<OperationType, number>;
    const operationsBySource = {} as Record<OperationSource, number>;

    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const record of this.records) {
      // 统计类型
      operationsByType[record.type] = (operationsByType[record.type] || 0) + 1;

      // 统计来源
      operationsBySource[record.source] = (operationsBySource[record.source] || 0) + 1;


      // 统计时间范围
      minTime = Math.min(minTime, record.timestamp);
      maxTime = Math.max(maxTime, record.timestamp);
    }

    return {
      totalOperations: this.records.length,
      operationsByType,
      operationsBySource,
      timeRange: {
        start: minTime === Infinity ? 0 : minTime,
        end: maxTime === -Infinity ? 0 : maxTime
      }
    };
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.records = [];
    this.setRecords([]);
  }

  /**
   * 销毁记录器
   */
  destroy(): void {
    // 清理事件监听器
    this.unregisterCallbacks.forEach((unregister) => unregister());
    this.unregisterCallbacks = [];

    // 清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // 清空记录
    this.clear();
  }
}
