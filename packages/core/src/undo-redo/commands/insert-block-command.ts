import { BaseCommand } from './command';
import { Editor } from '../../editor/editor';
import { OperationSnapshot } from '../snapshot-collector';
import { assert } from '../../utils/assert';

/**
 * 插入块命令 - 处理块插入操作的undo/redo
 */
export class InsertBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  /**
   * 执行命令（redo操作）- 重新插入块
   */
  execute(): void {
    const { containerId, blockIndex, afterBlock, afterSelection } = this.snapshot;

    assert(afterBlock, 'InsertBlockCommand: afterBlock is missing');

    try {
      // 重新插入块
      this.editor.editorDoc.localInsertBlock(containerId, blockIndex, afterBlock);

      // 恢复选区状态
      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('InsertBlockCommand execute failed:', error);
    }
  }

  /**
   * 撤销命令（undo操作）- 删除插入的块
   */
  undo(): void {
    const { containerId, blockIndex, beforeSelection } = this.snapshot;

    try {
      // 删除插入的块
      this.editor.editorDoc.localDeleteBlock(containerId, blockIndex);

      // 恢复选区状态
      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('InsertBlockCommand undo failed:', error);
    }
  }
}
