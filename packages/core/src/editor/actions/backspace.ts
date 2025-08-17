import { getBlockIndex } from '../../block/block-dom';
import { getContainerId, getParentContainer } from '../../container/container-dom';
import { Editor } from '../editor';
import { deleteEmptyBlock, deleteSelection, mergeSiblingBlocks } from './delete';
import { isEmptyTextBlock } from '../../text/text-utils';
import { createDeleteActions } from '../../text/delete-actions';

export function backspace(editor: Editor) {
  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  //
  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);
  if (editor.selection.range.isCollapsed()) {
    if (isEmptyTextBlock(block)) {
      return deleteEmptyBlock(editor, block);
    }

    if (focusPos.offset === 0) {
      return mergeSiblingBlocks(editor, block);
    }

    const actions = createDeleteActions(focusPos.offset - 1, 1);
    editor.doc.localUpdateBlockText(containerId, blockIndex, actions);
    return true;
  } else {
    // 使用通用的删除选区方法，支持多节点选区
    return deleteSelection(editor, editor.selection.range);
  }
}
