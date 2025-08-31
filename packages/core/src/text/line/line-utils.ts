import { assert } from '../../utils/assert';
import { TextBlockContentChild } from '../../index.type';
import { createExpandedRange } from '../../utils/dom';

// 常量
const LINE_HEIGHT_TOLERANCE = 2; // 行高容差，用于判断是否在同一行

/**
 * 合并同一行的文本矩形区域
 */
export function mergeTextRects(rects: DOMRectList): DOMRect[] {
  const mergedRects: DOMRect[] = [];
  let previousRect: DOMRect | null = null;

  for (let i = 0; i < rects.length; i++) {
    let currentRect = rects[i];

    if (previousRect && areRectsOnSameLine(previousRect, currentRect)) {
      // 合并到前一个矩形
      const mergedWidth = previousRect.width + currentRect.width;
      const mergedX = Math.min(previousRect.left, currentRect.left);
      currentRect = new DOMRect(mergedX, previousRect.top, mergedWidth, previousRect.height);
      mergedRects[mergedRects.length - 1] = currentRect;
    } else {
      mergedRects.push(currentRect);
    }

    previousRect = currentRect;
  }

  return mergedRects;
}

/**
 * 判断两个矩形是否在同一行（考虑误差范围）
 */
export function areRectsOnSameLine(rectA: DOMRect, rectB: DOMRect): boolean {
  return Math.abs(rectA.top - rectB.top) < LINE_HEIGHT_TOLERANCE;
}

/**
 * 获取文本节点的所有矩形区域（已合并处理）
 */
export function getTextNodeRects(textNode: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  return mergeTextRects(range.getClientRects());
}

/**
 * 获取元素的第一个客户端矩形
 */
function getFirstClientRect(childRects: DOMRectList): DOMRect {
  assert(childRects.length > 0, '元素应该有至少一个客户端矩形');
  return childRects[0];
}

/**
 * 获取元素的最后一个客户端矩形
 */
function getLastClientRect(childRects: DOMRectList): DOMRect {
  assert(childRects.length > 0, '元素应该有至少一个客户端矩形');
  return childRects[childRects.length - 1];
}

/**
 * 判断元素内容是否跨越多行
 */
export function isMultiLineChild(childRects: DOMRectList): boolean {
  const firstRect = getFirstClientRect(childRects);
  const lastRect = getLastClientRect(childRects);
  return !areRectsOnSameLine(firstRect, lastRect);
}

/**
 * 判断后续元素是否在新行开始
 */
export function doesNextChildStartNewLine(currentChildRects: DOMRectList, nextChildRects: DOMRectList): boolean {
  const currentEndRect = getLastClientRect(currentChildRects);
  const nextStartRect = getFirstClientRect(nextChildRects);
  return nextStartRect.left < currentEndRect.right;
}

/**
 * 从坐标点获取偏移量信息
 * @param targetTextNode 目标文本节点，用于验证快速定位结果
 * @param x 坐标x
 * @param y 坐标y
 * @returns 文本节点和偏移量信息
 */
export function getOffsetFromPoint(targetTextNode: Node | null, x: number, y: number): { textNode: Node | null; offset: number } {
  // 第一步：尝试快速定位
  const fastResult = tryFastPositioning(x, y);

  // 如果快速定位成功且节点匹配，直接返回
  if (
    fastResult.textNode &&
    targetTextNode &&
    (fastResult.textNode === targetTextNode || fastResult.textNode.parentNode === targetTextNode)
  ) {
    return fastResult;
  }

  // 第二步：降级使用精确定位
  if (targetTextNode) {
    return tryPrecisePositioning(targetTextNode, x, y);
  }

  // 如果没有目标节点，返回快速定位结果
  return fastResult;
}

/**
 * 快速定位方法
 */
function tryFastPositioning(x: number, y: number): { textNode: Node | null; offset: number } {
  let range: any;
  let textNode = null;
  let offset = -1;

  if ((document as any).caretPositionFromPoint) {
    range = (document as any).caretPositionFromPoint(x, y);
    if (range) {
      textNode = range.offsetNode;
      offset = range.offset;
    }
  } else if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
    if (range) {
      textNode = range.startContainer;
      offset = range.startOffset;
    }
  }

  return { textNode, offset };
}

/**
 * 精确定位方法，使用Range API进行二分查找
 */
function tryPrecisePositioning(targetTextNode: Node, x: number, y: number): { textNode: Node | null; offset: number } {
  // 获取文本节点的长度
  const textLength = targetTextNode.textContent?.length || 0;
  if (textLength === 0) {
    return { textNode: targetTextNode, offset: 0 };
  }

  // 首先遍历所有位置，找到在正确y范围内的候选位置
  const validCandidates: { offset: number; rect: DOMRect; distance: number }[] = [];

  for (let offset = 0; offset <= textLength; offset++) {
    const rect = getRangeRectAtOffset(targetTextNode, offset);
    if (rect && y >= rect.top && y <= rect.bottom) {
      const distance = Math.abs(rect.left - x) + Math.abs(rect.top + rect.height / 2 - y);
      validCandidates.push({ offset, rect, distance });
    }
  }

  // 如果没有找到有效候选位置，返回最接近的边界位置
  if (validCandidates.length === 0) {
    // 检查是否在文本开始之前
    const startRect = getRangeRectAtOffset(targetTextNode, 0);
    if (startRect && y < startRect.top) {
      return { textNode: targetTextNode, offset: 0 };
    }

    // 检查是否在文本结束之后
    const endRect = getRangeRectAtOffset(targetTextNode, textLength);
    if (endRect && y > endRect.bottom) {
      return { textNode: targetTextNode, offset: textLength };
    }

    // 默认返回文本中间位置
    return { textNode: targetTextNode, offset: Math.floor(textLength / 2) };
  }

  // 找到距离最小的候选位置
  let bestCandidate = validCandidates[0];
  for (const candidate of validCandidates) {
    if (candidate.distance < bestCandidate.distance) {
      bestCandidate = candidate;
    }
  }

  return { textNode: targetTextNode, offset: bestCandidate.offset };
}

/**
 * 获取指定偏移量处的Range矩形
 */
function getRangeRectAtOffset(textNode: Node, offset: number): DOMRect | null {
  const range = createExpandedRange(textNode, offset, textNode, offset);

  const rects = range.getClientRects();
  if (rects.length > 0) {
    // 如果有多个矩形（断行处），返回第一个矩形
    // 这通常是正确的，因为我们要的是光标位置
    return rects[0];
  }

  // 如果没有矩形，尝试创建一个包含单个字符的范围
  if (offset < (textNode.textContent?.length || 0)) {
    range.setEnd(textNode, offset + 1);
    const charRects = range.getClientRects();
    if (charRects.length > 0) {
      const charRect = charRects[0];
      // 返回字符左边缘的位置
      return new DOMRect(charRect.left, charRect.top, 0, charRect.height);
    }
  }

  // 如果还是没有矩形，尝试获取前一个字符的位置
  if (offset > 0) {
    range.setStart(textNode, offset - 1);
    range.setEnd(textNode, offset);
    const prevRects = range.getClientRects();
    if (prevRects.length > 0) {
      const prevRect = prevRects[prevRects.length - 1]; // 取最后一个矩形

      // 返回前一个字符的右边缘位置
      return new DOMRect(prevRect.right, prevRect.top, 0, prevRect.height);
    }
  }

  return null;
}
