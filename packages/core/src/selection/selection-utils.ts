import { EditorBlockPosition } from './block-position';
import { RichText } from '../text/delta';
import { Editor } from '../editor/editor';
import { EditorSelectionRange } from './selection-range';

import { getBlockIndex } from '../block/block-dom';
import { removeBackgrounds } from '../block/block-background';
import { getContainerId, getParentContainer } from '../container/container-dom';
import { assert } from '../utils/assert';

import { BlockElement, DocBlockTextActions } from '../index.type';
import { LineBreaker } from '../main';
import { assertLineBreaker } from '../text/line/text-line';
import { getDocTextLength } from '../text/text-utils';

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

export function updateSelection(editor: Editor, weakMap?: WeakMap<BlockElement, LineBreaker>) {
  editor.selection.getSelectedBlocks().forEach((selectedBlockInfo) => {
    const blockData = editor.getBlockData(selectedBlockInfo.block);
    const blockClass = editor.editorBlocks.getBlockClass(blockData.type);

    const lineBreaker = assertLineBreaker(selectedBlockInfo.block, weakMap);

    // TODO：调试代码，后续需要干掉
    const lastLine = lineBreaker.lines[lineBreaker.lines.length - 1];
    assert(lastLine, '最后一行不能为空');
    const lastOffset = lastLine.end;
    const blockLen = getDocTextLength(blockData.text!);
    assert(lastOffset === blockLen, `最后一行偏移量必须等于块长度，当前偏移量：${lastOffset}，块长度：${blockLen}`);

    blockClass?.updateSelection(editor, selectedBlockInfo.block, selectedBlockInfo.anchor, selectedBlockInfo.focus, lineBreaker);
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

  const blocks: { block: BlockElement; anchor: number; focus: number }[] = [];

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
