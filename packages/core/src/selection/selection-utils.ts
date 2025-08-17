import { EditorBlockPosition } from './block-position';
import { RichText } from '../text/delta';
import { Editor } from '../editor/editor';
import { EditorSelectionRange } from './selection-range';

import { DocBlockTextActions } from '../index.type';
import { getBlockIndex, removeBackgrounds } from '../block/block-dom';
import { getContainerId, getParentContainer } from '../container/container-dom';
import { assert } from '../main';

export function transformSelection(editor: Editor, blockId: string, delta: DocBlockTextActions) {
  const { range } = editor.selection;
  const { anchor, focus } = range;
  if (anchor.blockId !== blockId && focus.blockId !== blockId) {
    return range;
  }

  let newAnchor: EditorBlockPosition = anchor;
  if (anchor.blockId === blockId) {
    const newOffset = RichText.transformCursor(anchor.offset, delta);
    newAnchor = new EditorBlockPosition(blockId, newOffset);
  }

  let newFocus: EditorBlockPosition = focus;
  if (focus.blockId === blockId) {
    const newOffset = RichText.transformCursor(focus.offset, delta);
    newFocus = new EditorBlockPosition(blockId, newOffset);
  }

  return new EditorSelectionRange(editor, { anchor: newAnchor, focus: newFocus });
}

export function clearAllSelection(editor: Editor) {
  editor.rootContainer.querySelectorAll('[data-type="editor-block"]').forEach((block) => {
    removeBackgrounds(block as HTMLElement);
  });
}

export function updateSelection(editor: Editor) {
  editor.selection.getSelectedBlocks().forEach((selectedBlockInfo) => {
    const blockData = editor.getBlockData(selectedBlockInfo.block);
    const blockClass = editor.editorBlocks.getBlockClass(blockData.type);

    blockClass?.updateSelection(editor, selectedBlockInfo.block, selectedBlockInfo.anchor, selectedBlockInfo.focus);
  });
}

export function getRangeBlocks(editor: Editor, range: EditorSelectionRange) {
  const { start, end } = range;

  const startBlock = editor.getBlockById(start.blockId);
  let startIndex = getBlockIndex(startBlock);

  const endBlock = editor.getBlockById(end.blockId);
  const endIndex = getBlockIndex(endBlock);

  const container = getParentContainer(startBlock);
  const containerId = getContainerId(container);
  if (start.blockId === end.blockId) {
    return [{ block: startBlock, anchor: start.offset, focus: end.offset }];
  }

  const blocks: { block: HTMLElement; anchor: number; focus: number }[] = [];

  const blockLen = editor.getBlockTextLength(startBlock);
  blocks.push({ block: startBlock, anchor: start.offset, focus: blockLen });
  startIndex++;

  while (startIndex < endIndex) {
    const block = editor.findBlockByIndex(containerId, startIndex);
    assert(block, 'invalid block');

    blocks.push({ block, anchor: 0, focus: editor.getBlockTextLength(block) });

    startIndex++;
  }
  if (startIndex === endIndex) {
    blocks.push({ block: endBlock, anchor: 0, focus: end.offset });
  }

  return blocks;
}
