import { getBlockId, getBlockType, isLastBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../../text';
import { assert } from '../../utils/assert';

import { BlockElement } from '../../index.type';
import { getBlockStartPosition } from '../utils/navigation-utils';

export function selectRight(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const blockLen = blockClass.getBlockTextLength(editor.getBlockData(block));
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');

  if (focusPos.offset < blockLen) {
    // delta 计算
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, focusPos.offset + 1);
    editor.selection.setSelection(editor.selection.range.anchor, newFocusPos);
    return true;
  }

  if (!isLastBlock(block)) {
    const nextBlock = block.nextElementSibling as BlockElement;

    if (!isTextKindBlock(editor, nextBlock)) {
      const nextBlockPos = getBlockStartPosition(editor, nextBlock);
      editor.selection.setSelection(nextBlockPos, nextBlockPos);
      return true;
    }

    assert(isTextKindBlock(editor, nextBlock), 'not text kind block');

    const nextBlockClass = editor.editorBlocks.getBlockClass(getBlockType(nextBlock));
    const nextBlockLen = nextBlockClass.getBlockTextLength(editor.getBlockData(nextBlock));
    const offset = Math.min(1, nextBlockLen);
    const newFocusPos = new EditorBlockPosition(getBlockId(nextBlock), offset === -1 ? nextBlockLen : offset);
    editor.selection.setSelection(editor.selection.range.anchor, newFocusPos);
    return true;
  }

  return false;
}
