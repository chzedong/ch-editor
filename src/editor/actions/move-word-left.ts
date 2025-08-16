import { getBlockId, getBlockType, isBlock, isFirstBlock } from '../../block/block-dom';
import { Editor } from '../editor';
import { DocBlockText, DocBlockTextOp } from '../../index.type';
import { splitToThree } from '../../text/text-utils';
import { assert } from '../../utils/assert';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../editor-blocks';

function findPreWordOffset(ops: DocBlockText, offset: number, isSpan: boolean) {
  let isSpanOffset = isSpan;
  let tampIsSpan = false;
  while (offset > 0) {
    const { middle } = splitToThree(ops, offset - 1, 1);

    assert(middle.length === 1, 'middle not 1');
    assert(middle[0].insert.length === 1, 'middle first op length not 1');
    tampIsSpan = middle[0].insert[0] === ' ';
    if (tampIsSpan && !isSpanOffset) {
      return offset;
    }
    if (!tampIsSpan) {
      isSpanOffset = false;
    }
    offset--;
  }
  return tampIsSpan || isSpanOffset ? -1 : 0;
}

export function editorGetPreWordStart(ops: DocBlockText, offset: number) {

  if(ops.length === 0) {
    return 0;
  }

  const preOffset = Math.max(0, offset - 1);
  // if (preOffset === 0) {
  //   return 0;
  // }
  const { middle } = splitToThree(ops, preOffset, 1);
  assert(middle.length === 1, 'middle not 1');
  assert(middle[0].insert.length === 1, 'middle first op length not 1');
  const isSpan = middle[0].insert[0] === ' ';
  return findPreWordOffset(ops, preOffset, isSpan);
}

export function moveWordLeft(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  //
  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen');
  const blockData = editor.getBlockData(block);
  //
  assert(isTextKindBlock(editor, block), 'not text kind block');
  //
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
    const prevBlock = block.previousElementSibling as HTMLElement;

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
