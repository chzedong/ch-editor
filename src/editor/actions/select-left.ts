import { getBlockType } from "../../block/block-dom";
import { Editor } from "../editor";
import { assert } from "../../utils/assert";
import { EditorBlockPosition } from "../../selection/block-position";

export function selectLeft(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const block = editor.getBlockById(focusPos.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block))
  // 
  const blockLen = blockClass.getBlockTextLength(block);
  assert(focusPos.offset <= blockLen, 'focusPos.offset not <= blockLen')
  // 
  if (focusPos.offset > 0) {
    // delta 计算
    const newFocusPos = new EditorBlockPosition(focusPos.blockId, focusPos.offset - 1)
    editor.selection.setSelection(editor.selection.range.anchor, newFocusPos)
    return true;
  }
  return false
}