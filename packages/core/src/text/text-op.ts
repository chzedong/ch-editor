import { cloneDeep } from 'lodash-es';
import { isBoxOp } from '../box/box-op';
import { Editor } from '../editor/editor';
import { assert } from '../utils/assert';

import { DocBlock, DocBlockAttributes, DocBlockText, DocBlockTextActionOp, DocBlockTextActions, DocBlockTextOp } from '../index.type';

export function createInsertOp(offset: number, text: string, attributes: DocBlockAttributes | null) {
  if (text.length === 0) {
    return [];
  }

  const ops = [];
  if (offset > 0) {
    ops.push({
      retain: offset
    });
  }

  const newText = text.replaceAll('\r\n', ' ').replaceAll('\n', ' ').replaceAll('\r', ' ');
  const textOp: DocBlockTextActionOp = {
    insert: newText
  };
  if (attributes) {
    textOp.attributes = attributes;
  }
  ops.push(textOp);

  return ops;
}

/**
 * 构造删除操作的工具函数
 * @param startOffset 开始位置偏移量
 * @param deleteLength 删除长度
 * @returns 删除操作数组
 */
export function createDeleteActions(startOffset: number, deleteLength: number): DocBlockTextActions {
  const actions: DocBlockTextActions = [];
  if (startOffset > 0) {
    actions.push({ retain: startOffset });
  }
  if (deleteLength > 0) {
    actions.push({ delete: deleteLength });
  }
  return actions;
}

/**
 * 判断是否为文本操作
 */
export function isTextOp(op: DocBlockTextOp) {
  return 'insert' in op && typeof op.insert === 'string' && !isBoxOp(op);
}

/**
 * 判断是否为文本操作数组
 */
export function isTextBlock(block: DocBlock): block is DocBlock & { text: DocBlockTextOp[]} {
  return block.text !== undefined && Array.isArray(block.text) && block.text.every(isTextOp);
}

export function splitText(docText: DocBlockText, offset: number) {
  const left: DocBlockText = [];
  const right: DocBlockText = [];
  let preOffset = 0;
  const ops = cloneDeep(docText);
  for (const op of ops) {
    const len = op.insert.length;
    if (preOffset >= offset) {
      right.push(op);
    } else if (preOffset + len <= offset) {
      left.push(op);
    } else {
      const splitLen = offset - preOffset;
      const leftOp: DocBlockTextOp = {
        ...op,
        insert: op.insert.substring(0, splitLen)
      };
      const cloneOp = cloneDeep(op);
      const rightOp: DocBlockTextOp = {
        ...cloneOp,
        insert: op.insert.substring(splitLen)
      };
      left.push(leftOp);
      right.push(rightOp);
    }
    preOffset += len;
  }
  return { left, right };
}

export function splitToThree(docText: DocBlockText, offset: number, len: number) {
  const { left, right: tamp } = splitText(docText, offset);
  const { left: middle, right } = splitText(tamp, len);

  return { left, middle, right };
}

export function getDocTextLength(ops: DocBlockText) {
  let count = 0;
  ops.forEach((op) => {
    if (op.insert) {
      count += op.insert.length;
    }
  });
  return count;
} export const isEmptyBlockText = (blockText: DocBlockText) => {
  return !blockText.length || (blockText.length === 1 && !blockText[0].insert);
};

export function getTextAttributes(editor: Editor, containerId: string, blockIndex: number, offset: number) {
  const blockData = editor.editorDoc.getBlockData(containerId, blockIndex);
  assert(blockData.text, 'no block text');

  if (isEmptyBlockText(blockData.text)) {
    return null;
  }

  if (offset === 0) {
    return null;
  }

  const prev = splitText(blockData.text, offset).left;
  if (prev.length === 0) {
    return null;
  }

  const lastOp = prev[prev.length - 1];

  if (isBoxOp(lastOp)) {
    return null;
  }

  return lastOp.attributes;
}

