import { ICommand } from './commands/command';
import { CommandFactory } from './commands/command-factory';
import { GroupCommand } from './commands/group-command';
import { OperationSnapshot, SnapshotCollector } from './snapshot-collector';
import { Editor, assert } from '@ch-editor/core';

export class UndoManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxStackSize: number = 100;
  private isExecuting: boolean = false;
  private snapshotCollector: SnapshotCollector;

  private groupStack: Array<GroupCommand> = [];

  constructor(private editor: Editor, maxStackSize: number = 100) {
    this.maxStackSize = maxStackSize;
    this.snapshotCollector = new SnapshotCollector(editor, editor.editorDoc.hooks);
    this.setupSnapshotListener();
  }

  private setupSnapshotListener(): void {
    this.snapshotCollector.on('snapshot', (snapshot: OperationSnapshot) => {
      this.handleSnapshot(snapshot);
    });

    this.snapshotCollector.on('snapshotMerged', (mergedSnapshot: OperationSnapshot) => {
      this.handleSnapshotMerged(mergedSnapshot);
    });
  }

  private handleSnapshot(snapshot: OperationSnapshot): void {
    if (this.isExecuting) {
      return;
    }

    const command = CommandFactory.createCommand(this.editor, snapshot);
    if (command) {
      const currentGroupInfo = this.getCurrentGroupInfo();
      if (this.isInGroupMode() && currentGroupInfo.group) {
        currentGroupInfo.group.addCommand(command);
      } else {
        this.addCommand(command);
      }
    }
  }

  private handleSnapshotMerged(mergedSnapshot: OperationSnapshot): void {
    if (this.isExecuting) {
      return;
    }

    if (this.undoStack.length > 0) {
      const mergedCommand = CommandFactory.createCommand(this.editor, mergedSnapshot);
      if (mergedCommand) {
        this.undoStack[this.undoStack.length - 1] = mergedCommand;
        this.emitStateChange();
      }
    }
  }

  private addCommand(command: ICommand): void {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.emitStateChange();
  }

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
      if (this.redoStack.length > this.maxStackSize) {
        this.redoStack.shift();
      }
    }

    this.emitStateChange();
    this.isExecuting = false;

    return !isError;
  }

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

  canUndo(): boolean {
    return this.undoStack.length > 0 && !this.isExecuting;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0 && !this.isExecuting;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitStateChange();
  }

  setMaxStackSize(size: number): void {
    this.maxStackSize = Math.max(1, size);
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    while (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift();
    }
    this.emitStateChange();
  }

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

  getSnapshotCollector(): SnapshotCollector {
    return this.snapshotCollector;
  }

  private emitStateChange(): void {
    this.editor.emit('undoStateChange', this.getState());
  }

  beginGroup(): boolean {
    assert(!this.isExecuting, 'UndoManager: Cannot start group while executing undo/redo');
    const group = CommandFactory.createGroupCommand(this.editor, []);
    this.groupStack.push(group);
    return true;
  }

  endGroup(): boolean {
    assert(this.groupStack.length, 'UndoManager: Cannot end group when no group is active');
    const group = this.groupStack.pop();
    assert(group, 'groupInfo is undefined');

    if (this.groupStack.length === 0 && !group.isEmpty()) {
      this.addCommand(group);
    } else if (this.groupStack.length > 0 && !group.isEmpty()) {
      const parentGroup = this.groupStack[this.groupStack.length - 1];
      parentGroup.addCommand(group);
    }

    return true;
  }

  executeInGroup<T>(callback: () => T) {
    const initialStackLength = this.groupStack.length;
    try {
      this.beginGroup();
      const result = callback();
      assert(this.groupStack.length === initialStackLength + 1, 'groupStack length is not 1');
      this.endGroup();
      return result;
    } catch (error) {
      while (this.groupStack.length > initialStackLength) {
        this.groupStack.pop();
      }
      throw error;
    }
  }

  isInGroupMode(): boolean {
    return this.groupStack.length > 0;
  }

  getCurrentGroupInfo(): { group?: GroupCommand; depth: number } {
    const currentGroup = this.groupStack[this.groupStack.length - 1] ?? null;
    return {
      group: currentGroup,
      depth: this.groupStack.length || 0
    };
  }

  destroy(): void {
    this.groupStack = [];
    this.clear();
    this.snapshotCollector.destroy();
  }
}