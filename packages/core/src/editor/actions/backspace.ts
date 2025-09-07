import { Editor } from '../editor';
import { getBlockIndex } from '../../block/block-dom';
import { getContainerId, getParentContainer } from '../../container/container-dom';
import { deleteEmptyBlock, deleteSelection, mergeSiblingBlocks } from '../utils/block-utils';
import { isEmptyTextBlock, createDeleteActions } from '../../text';

export function backspace(editor: Editor) {
  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
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
    editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);
    return true;
  }

  // 使用通用的删除选区方法，支持多节点选区
  return deleteSelection(editor, editor.selection.range);
}
