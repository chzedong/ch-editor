import { Editor } from '../editor';
import { getBlockType } from '../../block/block-dom';
import { deleteText, isEmptyTextBlock } from '../../text/';
import { deleteEmptyBlock, mergeSiblingBlocks } from '../utils/block-utils';
import { editorGetPreWordStart } from '../utils/word-navigation-utils';
import { assert } from '../../utils/assert';

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
