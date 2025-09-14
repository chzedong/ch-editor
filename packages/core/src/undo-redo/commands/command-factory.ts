import { ICommand, CommandType } from './command';
import { UpdateBlockCommand } from './update-block-command';
import { InsertBlockCommand } from './insert-block-command';
import { DeleteBlockCommand } from './delete-block-command';
import { GroupCommand } from './group-command';
import { Editor } from '../../editor/editor';
import { OperationSnapshot } from '../snapshot-collector';
import { assert } from '../../utils/assert';

/**
 * 命令工厂类 - 根据快照类型创建对应的命令实例
 */
export class CommandFactory {
  /**
   * 根据快照类型创建对应的命令
   * @param editor 编辑器实例
   * @param snapshot 操作快照
   * @returns 对应的命令实例
   */
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

  /**
   * 批量创建命令
   * @param editor 编辑器实例
   * @param snapshots 操作快照数组
   * @returns 命令实例数组
   */
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

  /**
   * 检查快照类型是否支持
   * @param type 命令类型
   * @returns 是否支持
   */
  static isSupported(type: CommandType): boolean {
    return Object.values(CommandType).includes(type);
  }

  /**
   * 获取所有支持的命令类型
   * @returns 支持的命令类型数组
   */
  static getSupportedTypes(): CommandType[] {
    return Object.values(CommandType);
  }

  /**
   * 创建分组命令
   * @param editor 编辑器实例
   * @param commands 子命令数组
   * @returns GroupCommand实例
   */
  static createGroupCommand(editor: Editor, commands: ICommand[] = []): GroupCommand {
    return new GroupCommand(editor, commands);
  }
}
