import { Editor } from '@ch-editor/core';
import { type ICommand } from './command';

export class GroupCommand implements ICommand {
  private commands: ICommand[] = [];
  private editor: Editor;

  constructor(editor: Editor, commands: ICommand[] = []) {
    this.editor = editor;
    this.commands = [...commands];
  }

  addCommand(command: ICommand): void {
    if (this.hasCircularReference(command)) {
      throw new Error('Circular reference detected: Cannot add a GroupCommand that contains this command');
    }
    this.commands.push(command);
  }

  getCommands(): ICommand[] {
    return [...this.commands];
  }

  execute(): void {
    if (this.commands.length === 0) {
      return;
    }
    const executedCommands: ICommand[] = [];
    try {
      for (const command of this.commands) {
        command.execute();
        executedCommands.push(command);
      }
    } catch (error) {
      console.error('GroupCommand execute failed, rolling back:', error);
      for (let i = executedCommands.length - 1; i >= 0; i--) {
        try {
          executedCommands[i].undo();
        } catch (undoError) {
          console.error('Failed to rollback command during GroupCommand execute:', undoError);
        }
      }
      throw error;
    }
  }

  undo(): void {
    if (this.commands.length === 0) {
      return;
    }
    const undoneCommands: ICommand[] = [];
    try {
      for (let i = this.commands.length - 1; i >= 0; i--) {
        const command = this.commands[i];
        command.undo();
        undoneCommands.unshift(command);
      }
    } catch (error) {
      console.error('GroupCommand undo failed, rolling forward:', error);
      for (const command of undoneCommands) {
        try {
          command.execute();
        } catch (executeError) {
          console.error('Failed to rollforward command during GroupCommand undo:', executeError);
        }
      }
      throw error;
    }
  }

  isEmpty(): boolean {
    return this.commands.length === 0;
  }

  private hasCircularReference(command: ICommand, visited: Set<GroupCommand> = new Set()): boolean {
    if (command === this) {
      return true;
    }
    if (!(command instanceof GroupCommand)) {
      return false;
    }
    if (visited.has(command)) {
      return true;
    }
    visited.add(command);
    for (const subCommand of command.getCommands()) {
      if (subCommand instanceof GroupCommand) {
        if (this.hasCircularReference(subCommand, visited)) {
          return true;
        }
      }
    }
    visited.delete(command);
    return false;
  }
}
