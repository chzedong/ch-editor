import { getBlockIndex, getBlockType, getBlockId } from '../../block/block-dom';
import { getParentContainer, getContainerId } from '../../container/container-dom';
import { EditorBlockPosition } from '../../selection/block-position';
import { EditorSelectionRange } from '../../selection/selection-range';
import { getRangeBlocks } from '../../selection/selection-utils';
import { RichText } from '../../text/delta';
import { createDeleteActions } from '../../text/text-op';
import { isEmptyBlockText, isEmptyTextBlock, splitToThree } from '../../text/text-utils';
import { Editor } from '../editor';
import { assert } from '../../utils/assert';

import { BlockElement, DocBlockText, DocBlockTextActions } from '../../index.type';

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
    editor.doc.localUpdateBlockText(containerId, blockIndex, actions);

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
  editor.doc.localUpdateBlockText(firstContainerId, firstBlockIndex, firstBlockActions);

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
        editor.doc.localUpdateBlockText(firstContainerId, firstBlockIndex, insertActions);
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
    const blockLen = blockClass.getBlockTextLength(prevBlock);
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

  editor.doc.localUpdateBlockText(containerId, blockIndex - 1, insertActions);

  const pos = new EditorBlockPosition(getBlockId(prevBlock), firstBlockLength);
  const range = new EditorSelectionRange(editor, { anchor: pos, focus: pos });
  editor.deleteBlock(block, range);

  return true;
}

function findPreWordOffset(ops: DocBlockText, offset: number, isSpan: boolean) {
  let isSpanOffset = isSpan;
  let tampIsSpan = false;
  while (offset > 0) {
    const { middle } = splitToThree(ops, offset - 1, 1);

    assert(middle.length === 1, 'middle not 1');
    assert(middle[0].insert.length === 1, 'middle first op length not 1');
    tampIsSpan = middle[0].insert[0] === ' ';
    if (tampIsSpan && !isSpanOffset) {
      return offset;
    }
    if (!tampIsSpan) {
      isSpanOffset = false;
    }
    offset--;
  }
  return tampIsSpan || isSpanOffset ? -1 : 0;
}

export function editorGetPreWordStart(ops: DocBlockText, offset: number) {
  if (ops.length === 0) {
    return 0;
  }

  const preOffset = Math.max(0, offset - 1);
  // if (preOffset === 0) {
  //   return 0;
  // }
  const { middle } = splitToThree(ops, preOffset, 1);
  assert(middle.length === 1, 'middle not 1');
  assert(middle[0].insert.length === 1, 'middle first op length not 1');
  const isSpan = middle[0].insert[0] === ' ';
  return findPreWordOffset(ops, preOffset, isSpan);
}

function findNextWordEnd(ops: DocBlockText, offset: number, isSpan: boolean, len: number) {
  let isSpanOffset = isSpan;
  let tampIsSpan = false;
  while (offset < len) {
    const { middle } = splitToThree(ops, offset, 1);

    assert(middle.length === 1, 'middle not 1');
    assert(middle[0].insert.length === 1, 'middle first op length not 1');
    tampIsSpan = middle[0].insert[0] === ' ';
    if (tampIsSpan && !isSpanOffset) {
      return offset;
    }
    if (!tampIsSpan) {
      isSpanOffset = false;
    }
    offset++;
  }
  return tampIsSpan ? -1 : len;
}

export function editorGetNextWordEnd(ops: DocBlockText, offset: number, len: number) {

  if (ops.length === 0) {
    return 0;
  }

  if (offset >= len) {
    return len;
  }

  const { middle } = splitToThree(ops, offset, 1);
  assert(middle.length === 1, 'middle not 1');
  assert(middle[0].insert.length === 1, 'middle first op length not 1');
  const isSpan = middle[0].insert[0] === ' ';
  return findNextWordEnd(ops, offset, isSpan, len);
}

