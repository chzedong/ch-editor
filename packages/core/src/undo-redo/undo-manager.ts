import { ICommand } from './commands/command';
import { CommandFactory } from './commands/command-factory';
import { OperationSnapshot, SnapshotCollector } from './snapshot-collector';
import { Editor } from '../editor/editor';
import { assert } from '../utils/assert';

/**
 * UndoManager - 管理undo/redo栈和调度命令执行
 */
export class UndoManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxStackSize: number = 100;
  private isExecuting: boolean = false;
  private snapshotCollector: SnapshotCollector;

  constructor(private editor: Editor, maxStackSize: number = 100) {
    this.maxStackSize = maxStackSize;
    this.snapshotCollector = new SnapshotCollector(editor, editor.editorDoc.hooks);
    this.setupSnapshotListener();
  }

  /**
   * 设置快照监听器
   */
  private setupSnapshotListener(): void {
    // 监听快照收集器的快照事件
    this.snapshotCollector.on('snapshot', (snapshot: OperationSnapshot) => {
      this.handleSnapshot(snapshot);
    });
  }

  /**
   * 处理快照，创建命令并添加到undo栈
   * @param snapshot 操作快照
   */
  private handleSnapshot(snapshot: OperationSnapshot): void {
    if (this.isExecuting) {
      // 正在执行undo/redo操作时，不记录快照
      return;
    }

    const command = CommandFactory.createCommand(this.editor, snapshot);
    if (command) {
      this.addCommand(command);
    }
  }

  /**
   * 添加命令到undo栈
   * @param command 命令实例
   */
  private addCommand(command: ICommand): void {
    // 添加到undo栈
    this.undoStack.push(command);

    // 清空redo栈（新操作会使redo失效）
    this.redoStack = [];

    // 限制栈大小
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // 触发状态变化事件
    this.emitStateChange();
  }

  /**
   * 执行undo操作
   * @returns 是否成功执行
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.undoStack.pop();
    assert(command, 'undoStack is empty');

    this.isExecuting = true;
    let isError = false;

    try {
      command.undo();
    } catch (error) {
      console.error('Undo operation failed:', error);
      isError = true;
    }

    if (isError) {
      this.undoStack.push(command);
    } else {
      this.redoStack.push(command);
      // 限制redo栈大小
      if (this.redoStack.length > this.maxStackSize) {
        this.redoStack.shift();
      }
    }

    this.emitStateChange();
    this.isExecuting = false;

    return !isError;
  }

  /**
   * 执行redo操作
   * @returns 是否成功执行
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const command = this.redoStack.pop();
    assert(command, 'redoStack is empty');

    this.isExecuting = true;
    let isError = false;

    try {
      command.execute();
    } catch (error) {
      console.error('Redo operation failed:', error);
      isError = true;
    }

    if (!isError) {
      this.undoStack.push(command);
      // 限制undo栈大小
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
    } else {
      this.redoStack.push(command);
    }

    this.emitStateChange();
    this.isExecuting = false;
    return !isError;
  }

  /**
   * 检查是否可以undo
   * @returns 是否可以undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0 && !this.isExecuting;
  }

  /**
   * 检查是否可以redo
   * @returns 是否可以redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0 && !this.isExecuting;
  }

  /**
   * 获取undo栈大小
   * @returns undo栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取redo栈大小
   * @returns redo栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 清空所有栈
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitStateChange();
  }

  /**
   * 设置最大栈大小
   * @param size 最大栈大小
   */
  setMaxStackSize(size: number): void {
    this.maxStackSize = Math.max(1, size);

    // 调整现有栈大小
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    while (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift();
    }

    this.emitStateChange();
  }

  /**
   * 获取当前状态
   * @returns 当前状态信息
   */
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoStackSize: this.getUndoStackSize(),
      redoStackSize: this.getRedoStackSize(),
      isExecuting: this.isExecuting
    };
  }

  /**
   * 触发状态变化事件
   */
  private emitStateChange(): void {
    // 可以在这里触发事件，通知UI更新
    this.editor.emit('undoStateChange', this.getState());
  }

  /**
   * 销毁UndoManager
   */
  destroy(): void {
    this.clear();
    this.snapshotCollector.destroy();
  }
}
