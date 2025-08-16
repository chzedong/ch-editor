import { cloneDeep } from "lodash-es";
import { assert } from "../utils/assert";

import { DocBlockText, DocBlockTextOp } from "../index.type";
import { getTextBlockContentChildren } from "../line";

export function splitText(docText: DocBlockText, offset: number) {
  let left: DocBlockText = [];
  let right: DocBlockText = [];
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
        insert: op.insert.substring(0, splitLen),
      };
      const cloneOp = cloneDeep(op);
      const rightOp: DocBlockTextOp = {
        ...cloneOp,
        insert: op.insert.substring(splitLen),
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

export function getTextBlockContentChildTextLength(child: Element) {
  if (child instanceof HTMLBRElement) {
    return 0;
  }
  assert(typeof child.textContent === 'string', "invalid text content");
  return child.textContent?.length || 0;
}

export function isEmptyTextBlock(block: HTMLElement) {
  const children = getTextBlockContentChildren(block);
  let len = 0;
  children.forEach((child) => {
    len += getTextBlockContentChildTextLength(child);
  });
  return len === 0;
}
