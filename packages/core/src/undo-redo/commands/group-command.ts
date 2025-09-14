import { ICommand } from './command';
import { Editor } from '../../editor/editor';

/**
 * 分组命令 - 将多个命令作为一个原子操作进行管理
 * 支持将一系列操作统一进行撤销和重做
 */
export class GroupCommand implements ICommand {
  private commands: ICommand[] = [];
  private editor: Editor;

  constructor(editor: Editor, commands: ICommand[] = []) {
    this.editor = editor;
    this.commands = [...commands];
  }

  /**
   * 添加子命令到分组中
   * @param command 要添加的命令
   */
  addCommand(command: ICommand): void {
    // 检查循环引用
    if (this.hasCircularReference(command)) {
      throw new Error('Circular reference detected: Cannot add a GroupCommand that contains this command');
    }

    this.commands.push(command);
  }

  /**
   * 获取所有子命令
   * @returns 子命令数组的副本
   */
  getCommands(): ICommand[] {
    return [...this.commands];
  }

  /**
   * 执行分组中的所有命令（redo操作）
   * 按照添加顺序依次执行
   */
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
      // 如果执行过程中出现错误，需要回滚已执行的命令
      console.error('GroupCommand execute failed, rolling back:', error);

      // 逆序撤销已执行的命令
      for (let i = executedCommands.length - 1; i >= 0; i--) {
        try {
          executedCommands[i].undo();
        } catch (undoError) {
          console.error('Failed to rollback command during GroupCommand execute:', undoError);
        }
      }

      // 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 撤销分组中的所有命令（undo操作）
   * 按照添加顺序的逆序依次撤销
   */
  undo(): void {
    if (this.commands.length === 0) {
      return;
    }

    const undoneCommands: ICommand[] = [];

    try {
      // 逆序撤销命令
      for (let i = this.commands.length - 1; i >= 0; i--) {
        const command = this.commands[i];
        command.undo();
        undoneCommands.unshift(command); // 记录已撤销的命令，保持原始顺序
      }
    } catch (error) {
      // 如果撤销过程中出现错误，需要重新执行已撤销的命令
      console.error('GroupCommand undo failed, rolling forward:', error);

      // 重新执行已撤销的命令
      for (const command of undoneCommands) {
        try {
          command.execute();
        } catch (executeError) {
          console.error('Failed to rollforward command during GroupCommand undo:', executeError);
        }
      }

      // 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 检查分组是否为空
   * @returns 是否为空分组
   */
  isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * 检查是否存在循环引用
   * @param command 要检查的命令
   * @param visited 已访问的GroupCommand集合，用于检测循环
   * @returns 是否存在循环引用
   */
  private hasCircularReference(command: ICommand, visited: Set<GroupCommand> = new Set()): boolean {
    // 如果要添加的命令就是当前分组，直接返回true
    if (command === this) {
      return true;
    }

    // 如果不是GroupCommand，不会产生循环引用
    if (!(command instanceof GroupCommand)) {
      return false;
    }

    // 如果已经访问过这个GroupCommand，说明存在循环
    if (visited.has(command)) {
      return true;
    }

    // 将当前命令加入已访问集合
    visited.add(command);

    // 递归检查子命令
    for (const subCommand of command.getCommands()) {
      if (subCommand instanceof GroupCommand) {
        if (this.hasCircularReference(subCommand, visited)) {
          return true;
        }
      }
    }

    // 检查完毕，从已访问集合中移除
    visited.delete(command);
    return false;
  }
}
