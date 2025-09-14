import { ICommand } from './commands/command';
import { CommandFactory } from './commands/command-factory';
import { GroupCommand } from './commands/group-command';
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

  // 分组相关属性 - 使用栈结构支持嵌套分组
  private groupStack: Array<GroupCommand> = [];

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

    // 监听快照合并事件
    this.snapshotCollector.on('snapshotMerged', (mergedSnapshot: OperationSnapshot) => {
      this.handleSnapshotMerged(mergedSnapshot);
    });
  }

  /**
   * 处理快照，创建命令并添加到undo栈或当前分组
   * @param snapshot 操作快照
   */
  private handleSnapshot(snapshot: OperationSnapshot): void {
    if (this.isExecuting) {
      // 正在执行undo/redo操作时，不记录快照
      return;
    }

    const command = CommandFactory.createCommand(this.editor, snapshot);
    if (command) {
      const currentGroupInfo = this.getCurrentGroupInfo();
      if (this.isInGroupMode() && currentGroupInfo.group) {
        // 分组模式下，将命令添加到当前分组（栈顶分组）
        currentGroupInfo.group.addCommand(command);
      } else {
        // 正常模式下，直接添加到undo栈
        this.addCommand(command);
      }
    }
  }

  /**
   * 处理快照合并事件
   * @param mergedSnapshot 合并后的快照
   */
  private handleSnapshotMerged(mergedSnapshot: OperationSnapshot): void {
    if (this.isExecuting) {
      // 正在执行undo/redo操作时，不处理合并
      return;
    }

    // 如果undo栈中有命令，需要更新最后一个命令
    if (this.undoStack.length > 0) {
      // 创建新的合并命令来替换最后一个命令
      const mergedCommand = CommandFactory.createCommand(this.editor, mergedSnapshot);
      if (mergedCommand) {
        this.undoStack[this.undoStack.length - 1] = mergedCommand;

        // 触发状态变化事件
        this.emitStateChange();
      }
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
      isExecuting: this.isExecuting,
      isGrouping: this.isInGroupMode()
    };
  }

  /**
   * 获取快照收集器
   */
  getSnapshotCollector(): SnapshotCollector {
    return this.snapshotCollector;
  }

  /**
   * 触发状态变化事件
   */
  private emitStateChange(): void {
    // 可以在这里触发事件，通知UI更新
    this.editor.emit('undoStateChange', this.getState());
  }

  /**
   * 开始分组操作
   * @returns 是否成功开始分组
   */
  beginGroup(): boolean {
    assert(!this.isExecuting, 'UndoManager: Cannot start group while executing undo/redo');

    const group = CommandFactory.createGroupCommand(this.editor, []);
    this.groupStack.push(group);

    return true;
  }

  /**
   * 结束分组操作
   * @returns 是否成功结束分组
   */
  endGroup(): boolean {
    assert(this.groupStack.length, 'UndoManager: Cannot end group when no group is active');
    const group = this.groupStack.pop();
    assert(group, 'groupInfo is undefined');

    // 如果这是最外层分组且分组中有命令，则添加到undo栈
    if (this.groupStack.length === 0 && !group.isEmpty()) {
      this.addCommand(group);
    } else if (this.groupStack.length > 0 && !group.isEmpty()) {
      // 如果还有外层分组，将当前分组作为命令添加到外层分组
      const parentGroup = this.groupStack[this.groupStack.length - 1];
      parentGroup.addCommand(group);
    }

    return true;
  }

  /**
   * 在分组中执行操作
   * @param callback 要执行的操作回调
   * @param description 分组描述
   * @returns 执行结果
   */
  executeInGroup<T>(callback: () => T ) {
    const initialStackLength = this.groupStack.length;
    try {
      this.beginGroup();
      const result = callback();
      assert(this.groupStack.length === initialStackLength + 1, 'groupStack length is not 1');
      this.endGroup();

      return result;
    } catch (error) {
      // 如果执行失败，确保清理到初始状态
      while (this.groupStack.length > initialStackLength) {
        this.groupStack.pop();
      }

      throw error;
    }
  }

  /**
   * 检查是否处于分组模式
   * @returns 是否处于分组模式
   */
  isInGroupMode(): boolean {
    return this.groupStack.length > 0;
  }

  /**
   * 获取当前分组信息
   * @returns 当前分组信息
   */
  getCurrentGroupInfo(): {
    group?: GroupCommand;
    depth: number;
    } {
    const currentGroup = this.groupStack[this.groupStack.length - 1] ?? null;

    return {
      group: currentGroup,
      depth: this.groupStack.length || 0
    };
  }

  /**
   * 销毁UndoManager
   */
  destroy(): void {
    // 清理分组栈状态
    this.groupStack = [];

    this.clear();
    this.snapshotCollector.destroy();
  }
}
