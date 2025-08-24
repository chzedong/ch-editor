import { Editor } from '../editor/editor';
import { getContainerId, getParentContainer } from '../container/container-dom';
import { getBlockIndex } from '../block/block-dom';
import { getTextAttributes } from './text-utils';
import { createInsertOp } from './text-op';
import { deleteSelection } from '../editor/actions/utils';

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

