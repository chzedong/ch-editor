import { getBlockId, getBlockType, getPrevBlock, isFirstBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../../text';
import { assert } from '../../utils/assert';
import { getBlockEndPosition } from '../utils/navigation-utils';

export function selectLeft(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const blockLen = blockClass.getBlockTextLength(editor.getBlockData(block));
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');

  if (focusPos.offset > 0) {
    // delta 计算
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, focusPos.offset - 1);
    editor.selection.setSelection(editor.selection.range.anchor, newFocusPos);
    return true;
  }

  if (!isFirstBlock(block)) {
    const prevBlock = getPrevBlock(block);

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
    const offset =  prevBlockLen - 1;
    const newFocusPos = new EditorBlockPosition(
      getBlockId(prevBlock),
      offset === -1 ? 0 : offset
    );
    editor.selection.setSelection(editor.selection.range.anchor, newFocusPos);
    return true;
  }
  return false;
}
