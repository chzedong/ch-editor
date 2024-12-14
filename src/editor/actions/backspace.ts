import { getBlockIndex } from "../../block/block-dom";
import {
  getContainerId,
  getParentContainer
} from "../../container/container-dom";
import { Editor } from "../editor";

export function backspace(editor: Editor) {

  const focusPos = editor.selection.range.focus;
  const anchor = editor.selection.range.anchor;
  const block = editor.getBlockById(focusPos.blockId);
  //
  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);
  if (editor.selection.range.isCollapsed()) {
    editor.doc.localUpdateBlockText(containerId, blockIndex, [
      { retain: focusPos.offset - 1 },
      { delete: 1 },
    ])
    return true;
  } else {
    editor.doc.localUpdateBlockText(containerId, blockIndex, [
      { retain: editor.selection.range.start.offset },
      { delete: Math.abs(focusPos.offset - anchor.offset) },
    ]);
    return true;
  }
}
