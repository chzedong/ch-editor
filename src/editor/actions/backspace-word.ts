import { getBlockIndex, getBlockType } from "../../block/block-dom";
import {
  getContainerId,
  getParentContainer
} from "../../container/container-dom";
import { Editor } from "../editor";
import { assert } from "../../utils/assert";
import { EditorBlockPosition } from "../../selection/block-position";
import { editorGetPreWordStart } from "./move-word-left";
import { deleteText } from "../../text/delete-text";

export function backspaceWord(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  //
  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);

  const blockData = editor.getBlockData(block);
  assert(blockData.text, "not has text");
  const preOffset = editorGetPreWordStart(blockData.text, focusPos.offset);

  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, "focusPos.offset not <= blockLen");

  const newText = deleteText(editor, block, preOffset, focusPos.offset);
  editor.editorBlocks
    .getBlockClass("text")
    .setBlockText(editor, block, newText);
  //
  //

  //
  if (focusPos.offset > 0) {
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, preOffset);
    editor.selection.setSelection(newFocusPos, newFocusPos);
    return true;
  }
  return false;
}
