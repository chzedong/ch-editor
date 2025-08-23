import { getBlockId, getBlockType, isFirstBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { BlockElement, DocBlockText } from '../../index.type';
import { assert } from '../../utils/assert';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../editor-blocks';
import { editorGetPreWordStart } from './utils';

export function moveWordLeft(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');
  const blockData = editor.getBlockData(block);
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

    assert(isTextKindBlock(editor, prevBlock), 'no next block');

    const prevBlockClass = editor.editorBlocks.getBlockClass(
      getBlockType(prevBlock)
    );
    const prevBlockLen = prevBlockClass.getBlockTextLength(prevBlock);
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
