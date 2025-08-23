import { assert } from '../utils/assert';
import { getTextBlockContentChildren, getTextBlockContentChildTextLength } from '../text/text-utils';
import { BlockElement, TextBlockContentChild } from '../index.type';
import { SimpleBlockPosition, SimpleBlockPositionType } from '../selection/block-position';

// 背景
// 编辑器采用自主研发的输入引擎架构，系统基于模块化文档模型
// 1. 流式文档模型
//   - 采用Block-oriented文档结构，每个文本块(block)作为独立布局单元渲染引擎
//   - 区块级选区管理机制，最小操作粒度维持在block层级，确保：
//     - 跨区块选区的高效计算
//     - 布局变化时的增量更新
// 2. 混合排版引擎
//   1. 深度集成浏览器排版引擎，通过CSS word-break+overflow-wrap实现：
//     - 自动分词换行（CJK/非CJK混合文本）
//     - 响应式布局重构
//     - 精准渲染
// 3. Line抽象层创新
//   1. 为解决自动换行引发的选区复杂性，引入Line元数据模型
//     - 行级坐标映射（clientRect ↔ textOffset）
//     - 断行边界检测算法
//     - 行内光标定位补偿机制
// 核心挑战
// - 视觉呈现与逻辑位置的映射
//   - 浏览器原生换挡导致block内产生多行视觉单元
//   - 需要精确建立坐标映射系统
//   - 自动换行识别
// - 浏览器兼容性
//   - 核心API的兼容
//   - 特殊字符（零宽空格、unicode 复杂字符）的布局兼容处理
// - 性能与精度平衡
//   - 高频光标操作需要亚毫秒级响应
//   - 大规模文档的布局分析效率

export interface LineItem {
  child: TextBlockContentChild;
  startBlockOffset: number;
  endBlockOffset: number;
  contentRect: DOMRect;
}

// 常量
const LINE_HEIGHT_TOLERANCE = 2; // 行高容差，用于判断是否在同一行

/**
 * 合并同一行的文本矩形区域
 */
function mergeTextRects(rects: DOMRectList): DOMRect[] {
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
function areRectsOnSameLine(rectA: DOMRect, rectB: DOMRect): boolean {
  return Math.abs(rectA.top - rectB.top) < LINE_HEIGHT_TOLERANCE;
}

/**
 * 获取文本节点的所有矩形区域（已合并处理）
 */
function getTextNodeRects(textNode: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  return mergeTextRects(range.getClientRects());
}

/**
 * 获取元素的第一个客户端矩形
 */
function getFirstClientRect(child: TextBlockContentChild): DOMRect {
  const rects = child.getClientRects();
  assert(rects.length > 0, '元素应该有至少一个客户端矩形');
  return rects[0];
}

/**
 * 获取元素的最后一个客户端矩形
 */
function getLastClientRect(child: TextBlockContentChild): DOMRect {
  const rects = child.getClientRects();
  assert(rects.length > 0, '元素应该有至少一个客户端矩形');
  return rects[rects.length - 1];
}

/**
 * 判断元素内容是否跨越多行
 */
function isMultiLineChild(child: TextBlockContentChild): boolean {
  const firstRect = getFirstClientRect(child);
  const lastRect = getLastClientRect(child);
  return !areRectsOnSameLine(firstRect, lastRect);
}

/**
 * 判断后续元素是否在新行开始
 */
function doesNextChildStartNewLine(currentChild: TextBlockContentChild, nextChild: TextBlockContentChild): boolean {
  const currentEndRect = getLastClientRect(currentChild);
  const nextStartRect = getFirstClientRect(nextChild);
  return nextStartRect.left < currentEndRect.right;
}

/**
 * 获取文本块的总长度
 */
function getTextBlockLength(block: BlockElement): number {
  const children = getTextBlockContentChildren(block);
  let count = 0;
  children.forEach((child) => {
    count += getTextBlockContentChildTextLength(child);
  });
  return count;
}

/**
 * 从坐标点获取偏移量信息
 * @param targetTextNode 目标文本节点，用于验证快速定位结果
 * @param x 坐标x
 * @param y 坐标y
 * @returns 文本节点和偏移量信息
 */
function getOffsetFromPoint(targetTextNode: Node | null, x: number, y: number): { textNode: Node | null; offset: number } {
  // 第一步：尝试快速定位
  const fastResult = tryFastPositioning(x, y);

  // 如果快速定位成功且节点匹配，直接返回
  if (fastResult.textNode && targetTextNode &&
      (fastResult.textNode === targetTextNode || fastResult.textNode.parentNode === targetTextNode)) {
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
  try {
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);

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
  } catch (e) {
    // 忽略Range创建错误
    console.warn('getRangeRectAtOffset error:', e);
  }

  return null;
}
/**
 * TextLine 类
 * 用于管理行的信息，包括起始偏移、结束偏移和包含的子元素
 * 如果为box或者insertion，换行的场景下逻辑偏移量可能无效，这个时候需要回溯或者进行位置补偿
 */
export class TextLine {
  private _startOffset: number;
  private _endOffset: number;
  private readonly _items: LineItem[] = [];

  constructor(initialOffset: number) {
    this._startOffset = initialOffset;
    this._endOffset = initialOffset;
  }

  // 如果为box或者insertion，换行的场景下逻辑偏移量可能无效
  get start(): number {
    return this._startOffset;
  }

  get end(): number {
    return this._endOffset;
  }

  get items(): readonly LineItem[] {
    return this._items;
  }

  get lastItem(): LineItem | undefined {
    return this._items[this._items.length - 1];
  }

  /**
   * 向当前行添加子元素
   */
  addChild(child: TextBlockContentChild, textLength: number, contentRect: DOMRect): void {
    const startOffset = this._endOffset;
    const endOffset = startOffset + textLength;

    assert(
      textLength <= getTextBlockContentChildTextLength(child),
      `文本长度超过子元素范围 (${textLength} > ${getTextBlockContentChildTextLength(child)})`
    );

    this._items.push({
      child,
      startBlockOffset: startOffset,
      endBlockOffset: endOffset,
      contentRect
    });

    this._endOffset = endOffset;
  }

  /**
   * 获取行的边界矩形
   */
  getLineRect(): DOMRect {
    if (this._items.length === 0) {
      return new DOMRect(0, 0, 0, 0);
    }

    const firstItem = this._items[0];
    const lastItem = this._items[this._items.length - 1];

    return new DOMRect(
      firstItem.contentRect.left,
      firstItem.contentRect.top,
      lastItem.contentRect.right - firstItem.contentRect.left,
      firstItem.contentRect.height
    );
  }

  /**
   * 获取行的矩形区域（别名方法，用于调试可视化）
   */
  getRect(): DOMRect {
    return this.getLineRect();
  }

  /**
   * 检查偏移量是否在当前行范围内
   */
  containsOffset(offset: number, type: SimpleBlockPositionType = 'middle'): boolean {
    if (type === 'home') {
      return offset === this._startOffset;
    } else if (type === 'end') {
      return offset === this._endOffset;
    } else {
      return offset >= this._startOffset && offset <= this._endOffset;
    }
  }
}

/**
 * LineBreaker 类
 * 负责解析文本块，生成所有行的信息。它遍历每个子元素，判断是否需要换行，处理单行和多行文本，最后生成行的布局信息
 * 核心难点在于多行文本判断以及折行处的位置信息计算
 * 需要注意选区的type信息
 * 典型应用场景:
 * 1. 富文本编辑器的光标定位：offset -> rect
 * 2. 文本选区的高亮渲染：offset -> rect
 * 3. 键盘处理文本逻辑位置参考：折行处偏移量
 */
export class LineBreaker {
  private readonly _lines: TextLine[] = [];
  private readonly _block: BlockElement;
  private readonly _blockId: string;

  constructor(block: BlockElement) {
    this._block = block;
    this._blockId = block.id;
    this._parseBlockContent();
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get lines(): readonly TextLine[] {
    return this._lines;
  }

  /**
   * 解析块内容生成行信息
   */
  private _parseBlockContent(): void {
    const children = getTextBlockContentChildren(this._block);
    if (children.length === 0) {
      // 空块，创建一个空行
      this._createNewLine(0);
      return;
    }

    let currentLine = this._createNewLine(0);

    for (const [index, child] of children.entries()) {
      const childLength = getTextBlockContentChildTextLength(child);

      if (isMultiLineChild(child)) {
        currentLine = this._processMultiLineChild(child, currentLine);
      } else {
        this._processSingleLineChild(child, childLength, currentLine);
      }

      // 检查后续元素是否需要换行
      const nextChild = children[index + 1];
      if (nextChild && doesNextChildStartNewLine(child, nextChild)) {
        currentLine = this._createNewLine(currentLine.end);
      }
    }
  }

  /**
   * 处理单行子元素
   */
  private _processSingleLineChild(child: TextBlockContentChild, childLength: number, currentLine: TextLine): void {
    const rects = child.getClientRects();
    // assert(rects.length === 1, `期望单行子元素只有一个矩形区域，实际获取到 ${rects.length} 个`);
    currentLine.addChild(child, childLength, mergeTextRects(rects)[0]);
  }

  /**
   * 处理多行文本子元素
   */
  private _processMultiLineChild(child: TextBlockContentChild, currentLine: TextLine): TextLine {
    const textNode = child.firstChild;
    assert(textNode instanceof Text, `多行子元素应包含文本节点，实际类型为 ${typeof textNode}`);

    const textRects = getTextNodeRects(textNode);
    let processedOffset = 0;
    let resultLine = currentLine;

    for (const [rectIndex, rect] of textRects.entries()) {
      const offsetInfo = getOffsetFromPoint(textNode, rect.right, rect.bottom - 1);

      assert(offsetInfo.textNode === textNode, '偏移量计算应返回同一文本节点');

      const segmentLength = offsetInfo.offset - processedOffset;
      resultLine.addChild(child, segmentLength, rect);
      processedOffset = offsetInfo.offset;

      // 最后一个矩形不需要换行
      if (rectIndex < textRects.length - 1) {
        resultLine = this._createNewLine(resultLine.end);
      }
    }

    return resultLine;
  }

  /**
   * 创建新行并返回
   */
  private _createNewLine(startOffset: number): TextLine {
    const newLine = new TextLine(startOffset);
    this._lines.push(newLine);
    return newLine;
  }

  /**
   * 根据位置信息获取对应行索引
   */
  getLineIndex(position: SimpleBlockPosition): number {
    const totalLength = getTextBlockLength(this._block);
    assert(position.offset <= totalLength, `位置偏移量超出块范围 (${position.offset} > ${totalLength})`);

    for (const [lineIndex, line] of this._lines.entries()) {
      if (line.containsOffset(position.offset, position.type)) {
        return lineIndex;
      }
    }

    // 默认返回最后一行
    return this._lines.length - 1;
  }

  /**
   * 获取指定行
   */
  getLine(position: SimpleBlockPosition): TextLine {
    const lineIndex = this.getLineIndex(position);
    return this._lines[lineIndex];
  }

  /**
   * 获取指定行的布局信息
   */
  getLineRect(lineIndex: number): DOMRect {
    assert(lineIndex >= 0 && lineIndex < this._lines.length, '行索引超出范围');
    const line = this._lines[lineIndex];

    if (line.items.length === 0) {
      // 空行，返回块的左边界
      const blockRect = this._block.getBoundingClientRect();
      return new DOMRect(blockRect.left, blockRect.top, blockRect.width, 20); // 默认行高
    }

    return line.getLineRect();
  }

  /**
   * 根据坐标获取位置信息（双向检索：坐标 -> 偏移量）
   */
  getPositionFromPoint(x: number, y: number): SimpleBlockPosition {
    // 首先确定在哪一行
    let targetLineIndex = -1;
    for (const [lineIndex, line] of this._lines.entries()) {
      const lineRect = this.getLineRect(lineIndex);
      if (y >= lineRect.top && y <= lineRect.bottom) {
        targetLineIndex = lineIndex;
        break;
      }
    }

    // 如果没有找到精确匹配的行，找最接近的行
    if (targetLineIndex === -1) {
      let minDistance = Infinity;
      for (const [lineIndex, line] of this._lines.entries()) {
        const lineRect = this.getLineRect(lineIndex);
        const distance = Math.min(Math.abs(y - lineRect.top), Math.abs(y - lineRect.bottom));
        if (distance < minDistance) {
          minDistance = distance;
          targetLineIndex = lineIndex;
        }
      }
    }

    const targetLine = this._lines[targetLineIndex];

    // 在行内查找具体位置
    for (const item of targetLine.items) {
      const rect = item.contentRect;
      if (x >= rect.left && x <= rect.right) {
        // 在当前item内，需要精确计算偏移量
        const textNode = item.child.firstChild;
        if (textNode instanceof Text) {
          const offsetInfo = getOffsetFromPoint(textNode, x, y);

          if (offsetInfo.textNode === textNode && offsetInfo.offset >= 0) {
            const relativeOffset = offsetInfo.offset;
            const startBlockOffset = this._findFirstItemForChild(item.child)?.startBlockOffset ?? 0;
            const absoluteOffset = startBlockOffset + relativeOffset;

            // 计算type
            let type: SimpleBlockPositionType = 'middle';
            if (offsetInfo.offset === item.startBlockOffset) {
              type = 'home';
            } else if (offsetInfo.offset === item.endBlockOffset) {
              type = 'end';
            }

            return {
              offset: Math.min(absoluteOffset, item.endBlockOffset),
              type,
              blockId: this._blockId
            };
          }
        }

        // 如果无法精确计算，根据x坐标判断是开始还是结束
        const midX = rect.left + rect.width / 2;
        if (x < midX) {
          return { offset: item.startBlockOffset, type: 'home', blockId: this._blockId };
        } else {
          return { offset: item.endBlockOffset, type: 'end', blockId: this._blockId };
        }
      }
    }

    // 如果没有在任何item内，判断是在行首还是行尾
    if (targetLine.items.length === 0) {
      return { offset: targetLine.start, type: 'home', blockId: this._blockId };
    }

    const firstItem = targetLine.items[0];
    const lastItem = targetLine.items[targetLine.items.length - 1];

    if (x < firstItem.contentRect.left) {
      return { offset: targetLine.start, type: 'home', blockId: this._blockId };
    } else if (x > lastItem.contentRect.right) {
      return { offset: targetLine.end, type: 'end', blockId: this._blockId };
    } else {
      return { offset: targetLine.end, type: 'end', blockId: this._blockId };
    }
  }

  /**
   * 根据偏移量获取矩形位置（双向检索：偏移量 -> 坐标）
   */
  getCaretRect(position: SimpleBlockPosition): DOMRect {
    const line = this.getLine(position);

    for (const item of line.items) {
      if (position.offset === item.startBlockOffset) {
        const contentRect = item.contentRect;
        return new DOMRect(contentRect.left, contentRect.top, 1, contentRect.height);
      }

      if (position.offset === item.endBlockOffset) {
        const contentRect = item.contentRect;
        return new DOMRect(contentRect.right, contentRect.top, 1, contentRect.height);
      }

      if (position.offset > item.startBlockOffset && position.offset < item.endBlockOffset) {
        const textNode = item.child.firstChild;
        assert(textNode instanceof Text, `无效的文本子节点，不是有效的文本节点: ${typeof textNode}`);

        // 查找同一元素的第一个lineItem，获取真实的起始偏移量
        const firstItem = this._findFirstItemForChild(item.child);
        const realStartOffset = firstItem ? firstItem.startBlockOffset : item.startBlockOffset;
        const relativeOffset = position.offset - realStartOffset;

        const range = document.createRange();
        range.setStart(textNode, relativeOffset);
        range.setEnd(textNode, relativeOffset);
        const rects = range.getClientRects();

        if (rects.length > 0) {
          const contentRect = rects[0];
          return new DOMRect(contentRect.left, contentRect.top, 1, contentRect.height);
        }
      }
    }

    // 如果没有找到精确位置，返回行的开始或结束位置
    const lineRect = this.getLineRect(this.getLineIndex(position));
    if (position.type === 'home' || position.offset === line.start) {
      return new DOMRect(lineRect.left, lineRect.top, 1, lineRect.height);
    } else {
      return new DOMRect(lineRect.right, lineRect.top, 1, lineRect.height);
    }
  }

  /**
   * 查找子元素在整个块中的起始偏移量
   */
  findChildStartOffset(targetChild: TextBlockContentChild): number | undefined {
    for (const line of this._lines) {
      for (const item of line.items) {
        if (item.child === targetChild) {
          return item.startBlockOffset;
        }
      }
    }
    return undefined;
  }

  /**
   * 查找同一元素的第一个lineItem，获取真实的起始偏移量
   */
  private _findFirstItemForChild(targetChild: TextBlockContentChild): LineItem | undefined {
    for (const line of this._lines) {
      for (const item of line.items) {
        if (item.child === targetChild) {
          return item;
        }
      }
    }
    return undefined;
  }

  /**
   * 获取选区范围内的所有矩形
   * @param from 起始偏移量
   * @param to 结束偏移量
   * @returns 选区矩形数组
   */
  getSelectionRects(from: number, to: number): DOMRect[] {
    if (from === to) {
      return [];
    }

    // 确保 from <= to
    if (from > to) {
      [from, to] = [to, from];
    }

    const rects: DOMRect[] = [];

    for (const line of this._lines) {
      for (const item of line.items) {
        // 检查当前 item 是否与选区有重叠
        const itemStart = item.startBlockOffset;
        const itemEnd = item.endBlockOffset;

        if (itemEnd <= from || itemStart >= to) {
          // 没有重叠，跳过
          continue;
        }

        // 计算重叠部分
        const overlapStart = Math.max(itemStart, from);
        const overlapEnd = Math.min(itemEnd, to);

        if (overlapStart >= overlapEnd) {
          continue;
        }

        // 如果整个 item 都被选中
        if (overlapStart === itemStart && overlapEnd === itemEnd) {
          rects.push(item.contentRect);
          continue;
        }

        // 部分选中，需要计算精确的矩形
        const textNode = item.child.firstChild;
        if (textNode instanceof Text) {
          // 查找同一元素的第一个lineItem，获取真实的起始偏移量
          const firstItem = this._findFirstItemForChild(item.child);
          const realStartOffset = firstItem ? firstItem.startBlockOffset : itemStart;

          const relativeStart = overlapStart - realStartOffset;
          const relativeEnd = overlapEnd - realStartOffset;

          try {
            const range = document.createRange();
            range.setStart(textNode, relativeStart);
            range.setEnd(textNode, relativeEnd);

            const rangeRects = range.getClientRects();
            for (let i = 0; i < rangeRects.length; i++) {
              rects.push(rangeRects[i]);
            }
          } catch (error) {
            // 如果 Range 创建失败，使用整个 item 的矩形
            console.warn('getSelectionRects range error:', error);
            rects.push(item.contentRect);
          }
        } else {
          // 非文本节点，使用整个 item 的矩形
          rects.push(item.contentRect);
        }
      }
    }

    return rects;
  }
}

// 关键函数
/**
 * 获取文本光标矩形位置
 * @param block 块元素
 * @param pos 简单块位置
 * @returns 光标的DOMRect
 */
export function getTextCaretRect(block: BlockElement, pos: SimpleBlockPosition): DOMRect {
  const lineBreaker = new LineBreaker(block);
  return lineBreaker.getCaretRect(pos);
}

/**
 * 从坐标点获取块位置
 * @param block 块元素
 * @param x x坐标
 * @param y y坐标
 * @returns 简单块位置
 */
export function getPositionFromPoint(block: BlockElement, x: number, y: number): SimpleBlockPosition {
  const lineBreaker = new LineBreaker(block);
  return lineBreaker.getPositionFromPoint(x, y);
}

/**
 * 获取行分割器实例（缓存优化可以在这里实现）
 * @param block 块元素
 * @returns LineBreaker实例
 */
export function getLineBreaker(block: BlockElement): LineBreaker {
  // 这里可以实现缓存机制，避免重复解析
  return new LineBreaker(block);
}

