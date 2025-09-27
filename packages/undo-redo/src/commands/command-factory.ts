import { Editor, assert } from '@ch-editor/core';

import { type ICommand, CommandType } from './command';
import { UpdateBlockCommand } from './update-block-command';
import { InsertBlockCommand } from './insert-block-command';
import { DeleteBlockCommand } from './delete-block-command';
import { GroupCommand } from './group-command';
import { type OperationSnapshot } from '../snapshot-collector';

export class CommandFactory {
  static createCommand(editor: Editor, snapshot: OperationSnapshot): ICommand {
    switch (snapshot.type) {
    case CommandType.UPDATE_BLOCK:
      return new UpdateBlockCommand(editor, snapshot);
    case CommandType.INSERT_BLOCK:
      return new InsertBlockCommand(editor, snapshot);
    case CommandType.DELETE_BLOCK:
      return new DeleteBlockCommand(editor, snapshot);
    default:
      assert(false, `CommandFactory: Unsupported command type: ${snapshot.type}`);
    }
  }

  static createCommands(editor: Editor, snapshots: OperationSnapshot[]): ICommand[] {
    const commands: ICommand[] = [];
    for (const snapshot of snapshots) {
      const command = this.createCommand(editor, snapshot);
      if (command) {
        commands.push(command);
      }
    }
    return commands;
  }

  static isSupported(type: CommandType): boolean {
    return Object.values(CommandType).includes(type);
  }

  static getSupportedTypes(): CommandType[] {
    return Object.values(CommandType);
  }

  static createGroupCommand(editor: Editor, commands: ICommand[] = []): GroupCommand {
    return new GroupCommand(editor, commands);
  }
}
