import { findNextBlock, getBlockId, getBlockType, isLastBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../../text';
import { editorGetNextWordEnd } from '../utils/word-navigation-utils';
import { assert } from '../../utils/assert';
import { getBlockStartPosition } from '../utils/navigation-utils';

import { BlockElement, DocBlockText } from '../../index.type';

export function moveWordRight(editor: Editor) {
  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const blockLen = blockClass.getBlockTextLength(editor.getBlockData(block));
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');
  const blockData = editor.getBlockData(block);

  if (!isTextKindBlock(editor, block)) {
    const nextBlock = findNextBlock(block);
    if (!nextBlock) {
      return false;
    }
    const pos = getBlockStartPosition(editor, nextBlock);
    editor.selection.setSelection(pos, pos);
    return true;
  }

  assert(isTextKindBlock(editor, block), 'not text kind block');

  if (focusPos.offset < blockLen) {
    assert(blockData.text, 'not has text');
    const offset = editorGetNextWordEnd(blockData.text, focusPos.offset, blockLen);
    if (offset !== -1) {
      const newFocusPos = new EditorBlockPosition(focusPos.blockId, offset);
      editor.selection.setSelection(newFocusPos, newFocusPos);
      return true;
    }
  }

  if (!isLastBlock(block)) {
    const nextBlock = block.nextElementSibling as BlockElement;

    if (!isTextKindBlock(editor, nextBlock)) {
      const nextBlockPos = getBlockStartPosition(editor, nextBlock);
      editor.selection.setSelection(nextBlockPos, nextBlockPos);
      return true;
    }

    assert(isTextKindBlock(editor, nextBlock), 'not text kind block');

    const nextBlockData = editor.getBlockData(nextBlock);
    const blockLen = blockClass.getBlockTextLength(nextBlockData);
    const offset = editorGetNextWordEnd(nextBlockData.text as DocBlockText, 0, blockLen);
    const newFocusPos = new EditorBlockPosition(getBlockId(nextBlock), offset === -1 ? blockLen : offset);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }

  return false;
}
