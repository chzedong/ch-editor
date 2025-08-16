import { getBlockId, getBlockType, isLastBlock } from "../../block/block-dom";
import { Editor } from "../editor";
import { DocBlockText } from "../../index.type";
import { splitToThree } from "../../text/text-utils";
import { assert } from "../../utils/assert";
import { EditorBlockPosition } from "../../selection/block-position";
import { isTextKindBlock } from "../editor-blocks";

function findNextWordEnd(ops: DocBlockText, offset: number, isSpan: boolean, len: number) {
  let isSpanOffset = isSpan;
  let tampIsSpan = false;
  while (offset < len) {
    const { middle } = splitToThree(ops, offset, 1);

    assert(middle.length === 1, "middle not 1");
    assert(middle[0].insert.length === 1, "middle first op length not 1");
    tampIsSpan = middle[0].insert[0] === " ";
    if (tampIsSpan && !isSpanOffset) {
      return offset;
    }
    if (!tampIsSpan) {
      isSpanOffset = false;
    }
    offset++;
  }
  return tampIsSpan ? -1 : len;




}

export function editorGetNextWordEnd(ops: DocBlockText, offset: number, len: number) {

  if(ops.length === 0) {
    return 0;
  }

  const { middle } = splitToThree(ops, offset, 1);
  assert(middle.length === 1, "middle not 1");
  assert(middle[0].insert.length === 1, "middle first op length not 1");
  const isSpan = middle[0].insert[0] === " ";
  return findNextWordEnd(ops, offset, isSpan, len);
}

export function moveWordRight(editor: Editor) {
  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  //
  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, "focusPos.offset not <= blockLen");
  const blockData = editor.getBlockData(block);
  //
  assert(isTextKindBlock(editor, block), "not text kind block");
  //
  if (focusPos.offset < blockLen) {
    assert(blockData.text, "not has text");
    const offset = editorGetNextWordEnd(blockData.text, focusPos.offset, blockLen);
    if (offset !== -1) {
      const newFocusPos = new EditorBlockPosition(focusPos.blockId, offset);
      editor.selection.setSelection(newFocusPos, newFocusPos);
      return true;
    }
  }

  if (!isLastBlock(block)) {
    const nextBlock = block.nextElementSibling as HTMLElement;

    assert(isTextKindBlock(editor, nextBlock), "not text kind block");

    const nextBlockData = editor.getBlockData(nextBlock);
    const blockLen = blockClass.getBlockTextLength(nextBlock);
    const offset = editorGetNextWordEnd(nextBlockData.text as DocBlockText, 0, blockLen);
    const newFocusPos = new EditorBlockPosition(getBlockId(nextBlock), offset === -1 ? blockLen : offset);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }

  return false;
}
