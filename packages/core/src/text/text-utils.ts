import { cloneDeep } from 'lodash-es';
import { assert } from '../utils/assert';
import { getBlockContent } from '../block/block-dom';

import { BlockElement, DocBlockText, DocBlockTextOp, TextBlockContentChild } from '../index.type';

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
}

export function getTextBlockContentChildTextLength(child: TextBlockContentChild) {
  if (child.firstChild instanceof HTMLBRElement) {
    return 0;
  }
  assert(typeof child.textContent === 'string', 'invalid text content');
  return child.textContent?.length || 0;
}

export function getTextBlockContentChildren(block: BlockElement): TextBlockContentChild[] {
  const content = getBlockContent(block);
  const children = Array.from(content.children);

  // TODO: 会不会耗性能呢
  assert(
    children.every((child) => child instanceof HTMLSpanElement),
    'invalid text block content child'
  );
  // 可以加断言验证
  return children;
}

/**
 * 获取文本块的总长度
 */
export function getTextBlockLength(block: BlockElement): number {
  const children = getTextBlockContentChildren(block);
  let count = 0;
  children.forEach((child) => {
    count += getTextBlockContentChildTextLength(child);
  });
  return count;
}

export function isEmptyTextBlock(block: BlockElement) {
  const children = getTextBlockContentChildren(block);
  let len = 0;
  children.forEach((child) => {
    len += getTextBlockContentChildTextLength(child);
  });
  return len === 0;
}

export const isEmptyBlockText = (blockText: DocBlockText) => {
  return !blockText.length || (blockText.length === 1 && !blockText[0].insert);
};


