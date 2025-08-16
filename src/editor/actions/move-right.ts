import { getBlockId, getBlockType, isBlock, isLastBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { assert } from '../../utils/assert';

export function moveRight(editor: Editor) {

  const range = editor.selection.range;
  const focusPos = range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  //
  const blockLen = blockClass.getBlockTextLength(block);

  if(!range.isCollapsed()) {
    editor.selection.setSelection(range.end, range.end);
    return true;
  }


  if (focusPos.offset < blockLen) {
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, focusPos.offset + 1);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }

  if (!isLastBlock(block)) {
    const nextBlock = block.nextElementSibling as HTMLElement;
    assert(isBlock(nextBlock), 'no next block');

    const newFocusPos = new EditorBlockPosition(getBlockId(nextBlock), 0);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }
  return false;
}