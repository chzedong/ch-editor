import { BaseCommand } from './command';
import { Editor } from '../../editor/editor';
import { OperationSnapshot } from '../snapshot-collector';
import { DocBlockTextActionOp, DocBlockTextActions } from '../../index.type';
import { assert } from '../../utils/assert';
import { RichText } from '../../utils/delta';

/**
 * 更新块命令 - 处理文本更新操作的undo/redo
 */
export class UpdateBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  /**
   * 执行命令（redo操作）- 应用afterBlock的状态
   */
  execute(): void {
    const { containerId, blockIndex, afterBlock, afterSelection, beforeBlock } = this.snapshot;

    assert(afterBlock, 'UpdateBlockCommand: afterBlock is missing');
    assert(afterBlock.text, 'UpdateBlockCommand: afterBlock text is missing');
    assert(beforeBlock, 'UpdateBlockCommand: beforeBlock is missing');
    assert(beforeBlock.text, 'UpdateBlockCommand: beforeBlock text is missing');

    try {
      // 计算从当前状态到目标状态的差异
      const delta = RichText.diff(beforeBlock.text, afterBlock.text);
      const actions: DocBlockTextActions = delta.ops as DocBlockTextActionOp[];
      this.editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);

      // 恢复选区状态
      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('UpdateBlockCommand execute failed:', error);
    }
  }

  /**
   * 撤销命令（undo操作）- 恢复beforeBlock的状态
   */
  undo(): void {
    const { containerId, blockIndex, beforeBlock, beforeSelection, afterBlock } = this.snapshot;

    assert(beforeBlock, 'UpdateBlockCommand: beforeBlock is missing');
    assert(beforeBlock.text, 'UpdateBlockCommand: beforeBlock text is missing');
    assert(afterBlock, 'UpdateBlockCommand: afterBlock is missing');
    assert(afterBlock.text, 'UpdateBlockCommand: afterBlock text is missing');

    try {

      // 计算从当前状态到before状态的差异
      const delta = RichText.diff(afterBlock.text, beforeBlock.text);
      const actions: DocBlockTextActions = delta.ops as DocBlockTextActionOp[];
      this.editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);

      // 恢复选区状态
      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('UpdateBlockCommand undo failed:', error);
    }
  }
}
