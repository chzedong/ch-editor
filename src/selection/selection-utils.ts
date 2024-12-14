import { EditorBlockPosition } from "./block-position";
import { RichText } from "../text/delta";
import { Editor } from "../editor/editor";
import { EditorSelectionRange } from "./selection-range";

import { DocBlockTextActions } from "../index.type";

export function transformSelection(editor: Editor, blockId: string, delta: DocBlockTextActions) {
  const { range } = editor.selection;
  const { anchor, focus } = range
  if (anchor.blockId !== blockId && focus.blockId !== blockId) {
    return range;
  }

  let newAnchor: EditorBlockPosition = anchor;
  if (anchor.blockId === blockId) {
    const newOffset = RichText.transformCursor(anchor.offset, delta);
    newAnchor = new EditorBlockPosition(blockId, newOffset)
  }

  let newFocus: EditorBlockPosition = focus;
  if (focus.blockId === blockId) {
    const newOffset = RichText.transformCursor(focus.offset, delta);
    newFocus = new EditorBlockPosition(blockId, newOffset)
  }

  return new EditorSelectionRange(editor, { anchor: newAnchor, focus: newFocus })
}

export function clearAllSelection(editor: Editor) {
  const blockBackGround = Array.from(editor.rootContainer.querySelectorAll('.selection-background')) as HTMLElement[];

  blockBackGround.forEach((el) => {
    el.remove();
  })
}

export function updateSelection(editor: Editor) {
  editor.selection.getSelectedBlocks().forEach((selectedBlockInfo) => {
    const blockData = editor.getBlockData(selectedBlockInfo.block);
    const blockClass = editor.editorBlocks.getBlockClass(blockData.type);

    blockClass?.updateSelection(editor, selectedBlockInfo.block, selectedBlockInfo.anchor, selectedBlockInfo.focus)
  })
}