import { getBlockId, getBlockType, isBlock, isFirstBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { assert } from '../../utils/assert';
import { EditorBlockPosition } from '../../selection/block-position';

export function moveLeft(editor: Editor) {

  const range = editor.selection.range;
  const focusPos = range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  //
  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');

  if (!range.isCollapsed()) {
    editor.selection.setSelection(range.start, range.start);
    return true;
  }

  //
  if (focusPos.offset > 0) {
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, focusPos.offset - 1);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }

  if (focusPos.offset === 0) {
    if (!isFirstBlock(block)) {
      const prevBlock = block.previousElementSibling as HTMLElement;

      assert(isBlock(prevBlock), 'no next block');

      const prevBlockClass = editor.editorBlocks.getBlockClass(getBlockType(prevBlock));
      const prevBlockLen = prevBlockClass.getBlockTextLength(prevBlock);
      const newFocusPos = new EditorBlockPosition(getBlockId(prevBlock), prevBlockLen);
      editor.selection.setSelection(newFocusPos, newFocusPos);
      return true;
    }
  }
  return false;
}