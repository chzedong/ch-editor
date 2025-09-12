import { getBlockIndex, getBlockType, getBlockId } from '../../block/block-dom';
import { getParentContainer, getContainerId } from '../../container/container-dom';
import { EditorBlockPosition } from '../../selection/block-position';
import { EditorSelectionRange } from '../../selection/selection-range';
import { getRangeBlocks } from '../../selection/selection-dom';
import { RichText } from '../../utils/delta';
import { createDeleteActions } from '../../text/text-op';
import { isEmptyBlockText } from '../../text/text-op';
import { isEmptyTextBlock } from '../../text/text-dom';
import { Editor } from '../editor';
import { assert } from '../../utils/assert';

import { BlockElement, DocBlockTextActions } from '../../index.type';

export function deleteSelection(editor: Editor, range: EditorSelectionRange): boolean {
  // 如果选区已折叠，无需删除
  if (range.isCollapsed()) {
    return false;
  }

  const { start, end } = range;
  const selectedBlocks = getRangeBlocks(editor, range);

  // 单节点选区删除
  if (start.blockId === end.blockId) {
    const block = editor.getBlockById(start.blockId);
    const blockIndex = getBlockIndex(block);
    const container = getParentContainer(block);
    const containerId = getContainerId(container);

    const actions = createDeleteActions(start.offset, end.offset - start.offset);
    editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);

    return true;
  }

  // 多节点选区删除
  return deleteMultiBlockSelection(editor, selectedBlocks, start, end);
}

/**
 * 处理多节点选区删除
 */
function deleteMultiBlockSelection(
  editor: Editor,
  selectedBlocks: Array<{ block: BlockElement; anchor: number; focus: number }>,
  start: EditorBlockPosition,
  end: EditorBlockPosition
): boolean {
  assert(selectedBlocks.length > 1, 'Multi-block selection should have more than 1 block');

  const firstBlock = selectedBlocks[0];
  const lastBlock = selectedBlocks[selectedBlocks.length - 1];

  // 获取第一个和最后一个块的容器信息
  const firstContainer = getParentContainer(firstBlock.block);
  const firstContainerId = getContainerId(firstContainer);
  const firstBlockIndex = getBlockIndex(firstBlock.block);

  const lastContainer = getParentContainer(lastBlock.block);
  const lastContainerId = getContainerId(lastContainer);

  // 确保在同一个容器中
  assert(firstContainerId === lastContainerId, 'Multi-block selection must be in the same container');

  // 1. 处理第一个块：删除从选区开始到块结束的内容
  const firstBlockActions = createDeleteActions(start.offset, firstBlock.focus - start.offset);
  editor.editorDoc.localUpdateBlockText(firstContainerId, firstBlockIndex, firstBlockActions);

  // 2. 删除中间的完整块（从后往前删除，避免索引变化）
  for (let i = selectedBlocks.length - 2; i > 0; i--) {
    const blockToDelete = selectedBlocks[i];
    editor.deleteBlock(blockToDelete.block);
  }

  // 3. 处理最后一个块：获取剩余内容并合并到第一个块
  const lastBlockData = editor.getBlockData(lastBlock.block);
  const lastBlockLen = editor.getBlockTextLength(lastBlock.block);

  // 删除最后一个块
  editor.deleteBlock(lastBlock.block);

  if (lastBlockData.text && end.offset < lastBlockLen) {
    // 获取最后一个块中选区结束后的剩余内容
    const remainingActions = createDeleteActions(0, end.offset);
    const restText = RichText.apply(lastBlockData.text, remainingActions);

    // 获取剩余文本内容
    if (!isEmptyBlockText(restText)) {
      const insertActions: DocBlockTextActions = [];

      // 定位到第一个块的末尾
      const firstBlockLength = editor.getBlockTextLength(firstBlock.block);
      if (firstBlockLength > 0) {
        insertActions.push({ retain: firstBlockLength });
      }

      // 插入剩余内容
      restText.forEach((op) => {
        if (op.insert) {
          insertActions.push({ insert: op.insert, attributes: op.attributes });
        }
      });

      if (insertActions.length > 0) {
        editor.editorDoc.localUpdateBlockText(firstContainerId, firstBlockIndex, insertActions);
      }
    }
  }

  // 设置光标到选区起始位置
  const newPos = new EditorBlockPosition(start.blockId, start.offset);
  editor.selection.setSelection(newPos, newPos);

  return true;
}

export function deleteEmptyBlock(editor: Editor, block: BlockElement) {
  assert(isEmptyTextBlock(block), 'block must be empty text block');

  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);

  const prevBlock = editor.findBlockByIndex(containerId, blockIndex - 1);
  if (prevBlock) {
    const blockClass = editor.editorBlocks.getBlockClass(getBlockType(prevBlock));
    const blockLen = blockClass.getBlockTextLength(editor.getBlockData(prevBlock));
    const pos = new EditorBlockPosition(getBlockId(prevBlock), blockLen);
    editor.deleteBlock(block, new EditorSelectionRange(editor, { anchor: pos, focus: pos }));
    return true;
  } else {
    return false;
  }
}

export function mergeSiblingBlocks(editor: Editor, block: BlockElement) {
  if (isEmptyTextBlock(block)) {
    return deleteEmptyBlock(editor, block);
  }

  const blockIndex = getBlockIndex(block);
  const container = getParentContainer(block);
  const containerId = getContainerId(container);
  const prevBlock = editor.findBlockByIndex(containerId, blockIndex - 1);
  if (!prevBlock) {
    return false;
  }

  const insertActions: DocBlockTextActions = [];
  const firstBlockLength = editor.getBlockTextLength(prevBlock);
  if (firstBlockLength > 0) {
    insertActions.push({ retain: firstBlockLength });
  }

  const blockData = editor.getBlockData(block);

  assert(blockData.text, 'block text must be defined');

  blockData.text.forEach((op) => {
    if (op.insert) {
      insertActions.push({ insert: op.insert, attributes: op.attributes });
    }
  });

  assert(insertActions.length > 0, 'insert actions must be greater than 0');

  editor.editorDoc.localUpdateBlockText(containerId, blockIndex - 1, insertActions);

  const pos = new EditorBlockPosition(getBlockId(prevBlock), firstBlockLength);
  const range = new EditorSelectionRange(editor, { anchor: pos, focus: pos });
  editor.deleteBlock(block, range);

  return true;
}


