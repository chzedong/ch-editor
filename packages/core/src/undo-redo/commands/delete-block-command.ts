import { BaseCommand } from './command';
import { Editor } from '../../editor/editor';
import { OperationSnapshot } from '../snapshot-collector';
import { assert } from '../../utils/assert';

/**
 * 删除块命令 - 处理块删除操作的undo/redo
 */
export class DeleteBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  /**
   * 执行命令（redo操作）- 重新删除块
   */
  execute(): void {
    const { containerId, blockIndex, afterSelection } = this.snapshot;

    try {
      // 重新删除块
      this.editor.editorDoc.localDeleteBlock(containerId, blockIndex);

      // 恢复选区状态
      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('DeleteBlockCommand execute failed:', error);
    }
  }

  /**
   * 撤销命令（undo操作）- 重新插入被删除的块
   */
  undo(): void {
    const { containerId, blockIndex, beforeBlock, beforeSelection } = this.snapshot;

    assert(beforeBlock, 'DeleteBlockCommand: beforeBlock is missing');

    try {
      // 重新插入被删除的块
      this.editor.editorDoc.localInsertBlock(containerId, blockIndex, beforeBlock);

      // 恢复选区状态
      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('DeleteBlockCommand undo failed:', error);
    }
  }

}
