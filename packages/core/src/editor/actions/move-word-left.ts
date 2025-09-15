import { findPrevBlock, getBlockId, getBlockType, getPrevBlock, isFirstBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../../text';
import { editorGetPreWordStart } from '../utils/word-navigation-utils';
import { assert } from '../../utils/assert';
import { getBlockEndPosition } from '../utils/navigation-utils';

import { BlockElement, DocBlockText } from '../../index.type';

export function moveWordLeft(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const blockLen = blockClass.getBlockTextLength(editor.getBlockData(block));
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');
  const blockData = editor.getBlockData(block);

  if (!isTextKindBlock(editor, block)) {
    const preBlock = findPrevBlock(block);
    if (!preBlock) {
      return false;
    }
    const pos = getBlockEndPosition(editor, preBlock);
    editor.selection.setSelection(pos, pos);
    return true;
  }

  assert(isTextKindBlock(editor, block), 'not text kind block');

  if (focusPos.offset > 0) {
    assert(blockData.text, 'not has text');
    const offset = editorGetPreWordStart(blockData.text, focusPos.offset);
    if (offset !== -1) {
      const newFocusPos = new EditorBlockPosition(
        focusPos.blockId,
        offset
      );
      editor.selection.setSelection(newFocusPos, newFocusPos);
      return true;
    }
  }

  if (!isFirstBlock(block)) {
    const prevBlock = block.previousElementSibling as BlockElement;

    if (!isTextKindBlock(editor, prevBlock)) {
      const prevBlockPos = getBlockEndPosition(editor, prevBlock);
      editor.selection.setSelection(prevBlockPos, prevBlockPos);
      return true;
    }

    assert(isTextKindBlock(editor, prevBlock), 'no next block');

    const prevBlockClass = editor.editorBlocks.getBlockClass(
      getBlockType(prevBlock)
    );
    const prevBlockLen = prevBlockClass.getBlockTextLength(editor.getBlockData(prevBlock));
    const prevBlockData = editor.getBlockData(prevBlock);
    const offset = editorGetPreWordStart(prevBlockData.text as DocBlockText, prevBlockLen);
    const newFocusPos = new EditorBlockPosition(
      getBlockId(prevBlock),
      offset === -1 ? 0 : offset
    );
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }

  return false;
}
