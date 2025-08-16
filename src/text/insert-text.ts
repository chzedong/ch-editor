import { Editor } from '../editor/editor';
import {
  getContainerId,
  getParentContainer
} from '../container/container-dom';
import { getBlockIndex } from '../block/block-dom';
import { getDocTextLength } from './text-utils';
import { assert } from '../utils/assert';

import { DocBlockAttributes, DocBlockTextActionOp } from '../index.type';

export function editorInsertText(editor: Editor, text: string) {
  const pos = editor.selection.range.start;
  const blockId = pos.blockId;
  const block = editor.getBlockById(blockId);
  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);
  // create op
  const attributes = getTextAttributes(
    editor,
    containerId,
    blockIndex,
    pos.offset
  );
  const ops = createInsertOp(pos.offset, text, attributes ?? null);
  // doc change
  editor.doc.localUpdateBlockText(containerId, blockIndex, ops);
}

export function createInsertOp(
  offset: number,
  text: string,
  attributes: DocBlockAttributes | null
) {
  if (text.length === 0) {
    return [];
  }
  const ops = [];
  if (offset > 0) {
    ops.push({
      retain: offset
    });
  }
  const newText = text
    .replaceAll('\r\n', ' ')
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ');
  const textOp: DocBlockTextActionOp = {
    insert: newText
  };
  if (attributes) {
    textOp.attributes = attributes;
  }
  ops.push(textOp);
  return ops;
}

export function getTextAttributes(
  editor: Editor,
  containerId: string,
  blockIndex: number,
  offset: number
) {
  const blockData = editor.doc.getBlockData(containerId, blockIndex);
  assert(blockData.text, 'no block text');
  if (getDocTextLength(blockData.text) === 0) {
    return null;
  }
  if ((offset = 0)) {
    return undefined;
  }
  //
  // const prev = splitToThree(blockData.text, offset - 1, 1).middle;
  // return prev[0].attributes;
  return null;
}
