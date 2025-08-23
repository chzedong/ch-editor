import { getBlockType } from '../../block/block-dom';
import { Editor } from '../editor';
import { assert } from '../../utils/assert';
import { deleteText } from '../../text/delete-text';
import { isEmptyTextBlock } from '../../text/text-utils';
import { deleteEmptyBlock, mergeSiblingBlocks, editorGetPreWordStart } from './utils';

export function backspaceWord(editor: Editor) {
  if (!editor.selection.range.isCollapsed()) {
    return false;
  }

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));

  if (isEmptyTextBlock(block)) {
    return deleteEmptyBlock(editor, block);
  }

  if (focusPos.offset === 0) {
    return mergeSiblingBlocks(editor, block);
  }

  const blockData = editor.getBlockData(block);
  assert(blockData.text, 'not has text');
  const preOffset = editorGetPreWordStart(blockData.text, focusPos.offset);

  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');

  deleteText(editor, block, preOffset, focusPos.offset);
  return true;
}
