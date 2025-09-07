import { getBlockIndex } from '../block/block-dom';
import { getParentContainer, getContainerId } from '../container/container-dom';
import { deleteSelection } from '../editor/utils/block-utils';
import { Editor } from '../editor/editor';
import { createDeleteActions, createInsertOp } from './text-op';
import { getTextAttributes } from './text-op';
import { assert } from '../utils/assert';

import { BlockElement } from '../index.type';


export const deleteText = (editor: Editor, block: BlockElement, from: number, to: number) => {
  assert(from < to, 'from must < to');

  const blockData = editor.getBlockData(block);
  const blockClass = editor.editorBlocks.getBlockClass(blockData.type);
  const blockLen = blockClass.getBlockTextLength(block);
  assert(to <= blockLen, 'to must <= blockLen');

  const container = getParentContainer(block);
  const containerId = getContainerId(container);
  const blockIndex = getBlockIndex(block);

  return editor.editorDoc.localUpdateBlockText(containerId, blockIndex, createDeleteActions(from, to - from));
};

export function editorInsertText(editor: Editor, text: string) {
  const pos = editor.selection.range.start;
  const blockId = pos.blockId;
  const block = editor.getBlockById(blockId);
  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);

  if (!editor.selection.range.isCollapsed()) {
    deleteSelection(editor, editor.selection.range);
  }

  const attributes = getTextAttributes(editor, containerId, blockIndex, pos.offset);
  const ops = createInsertOp(pos.offset, text, attributes ?? null);
  editor.editorDoc.localUpdateBlockText(containerId, blockIndex, ops);
}

