import { Editor } from '../editor/editor';
import { getBlockIndex } from '../block/block-dom';
import { getContainerId, getParentContainer } from '../container/container-dom';
import { assert } from '../utils/assert';
import { createDeleteActions } from './text-op';
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
