import { cloneDeep } from 'lodash-es';
import { getBlockIndex } from '../../block/block-dom';
import { getContainerId, getParentContainer } from '../../container/container-dom';
import { DocBlock, DocBlockText } from '../../index.type';
import { deleteText } from '../../text/text-action';
import { splitText } from '../../text/text-op';
import { assert } from '../../utils/assert';
import { genId } from '../../utils/get-id';
import { Editor } from '../editor';
import { isTextKindBlock } from '../../text/text-block';
import { deleteSelection } from './utils';

const breakCollapsedBlock = (editor: Editor) => {
  const isCollapsed = editor.selection.range.isCollapsed();
  assert(isCollapsed, 'Selection must be collapsed to break block');

  const { blockId, offset } = editor.selection.range.start;
  const block = editor.getBlockById(blockId);

  assert(isTextKindBlock(editor, block), 'Block must be text kind to break');

  const blockData = editor.getBlockData(block);
  const text = blockData.text as DocBlockText;
  const { right } = splitText(text, offset);

  const containerId = getContainerId(getParentContainer(block));
  const blockIndex = getBlockIndex(block);
  const blockClass = editor.editorBlocks.getBlockClass(blockData.type);
  const blockLen = blockClass.getBlockTextLength(block);

  if (blockLen - offset > 0) {
    deleteText(editor, block, offset, blockLen);
  }

  // insert bottom
  const newBlockData: DocBlock = {
    ...cloneDeep(blockData),
    id: genId(),
    text: right
  };
  editor.insertBlock(containerId, blockIndex + 1, newBlockData);

  return true;
};

export const breakBlock = (editor: Editor) => {
  const isCollapsed = editor.selection.range.isCollapsed();
  if (isCollapsed) {
    return breakCollapsedBlock(editor);
  }

  deleteSelection(editor, editor.selection.range);
  return breakCollapsedBlock(editor);
};
