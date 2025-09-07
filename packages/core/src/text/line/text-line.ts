import { SimpleBlockPositionType, SimpleBlockPosition } from '../../selection/block-position';
import { getTextBlockContentChildTextLength, getTextBlockContentChildren, getTextBlockLength } from '../text-dom';
import {
  isMultiLineChild,
  doesNextChildStartNewLine,
  mergeTextRects,
  getTextNodeRects,
  getOffsetFromPoint,
  areRectsOnSameLine
} from './line-utils';
import { assert } from '../../utils/assert';
import { createExpandedRange } from '../../utils/dom';
import { isBoxWrapper, canBoxWrap } from '../../box/box-dom';
import { canWidgetWrap, getWidgetIndexPosition, isWidgetElement } from '../../decorator/decorator-dom';

import { TextBlockContentChild, BlockElement } from '../../index.type';

/**
 * 行项虚拟类型
 */
export type LineItemVirtualType = 'valid' | 'valid-start' | 'valid-end' | 'virtual';

/**
 * 基础 LineItem 接口
 */
export interface BaseLineItem {
  child: TextBlockContentChild;
  startBlockOffset: number;
  endBlockOffset: number;
  contentRect: DOMRect;
}

/**
 * 文本类型的 LineItem
 */
export interface TextLineItem extends BaseLineItem {
  type: 'text';
  virtualType: LineItemVirtualType;
}

/**
 * Box 类型的 LineItem
 */
export interface BoxLineItem extends BaseLineItem {
  type: 'box';
  virtualType: LineItemVirtualType;
}

export interface WidgetLineItem extends BaseLineItem {
  type: 'widget';
  // 新增一个字段，表示索引位置应该位于widget的前面还是后面
  indexPosition: 'before' | 'after';
  virtualType: LineItemVirtualType;
}

/**
 * 联合类型的 LineItem
 */
export type LineItem = TextLineItem | BoxLineItem | WidgetLineItem;

/**
 * 类型守卫函数
 */
export function isWidgetLineItem(item: LineItem): item is WidgetLineItem {
  return item.type === 'widget';
}

export function isTextLineItem(item: LineItem): item is TextLineItem {
  return item.type === 'text';
}

export function isBoxLineItem(item: LineItem): item is BoxLineItem {
  return item.type === 'box';
}

/**
 * TextLine 类
 * 用于管理行的信息，包括起始偏移、结束偏移和包含的子元素
 * 如果为box或者insertion，换行的场景下逻辑偏移量可能无效，这个时候需要回溯或者进行位置补偿 TODO: 待确认
 */
export class TextLine {
  private _startOffset: number;
  private _endOffset: number;
  private readonly _items: LineItem[] = [];

  constructor(initialOffset: number) {
    this._startOffset = initialOffset;
    this._endOffset = initialOffset;
  }

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

  _calculateVirtualType = (isValidStart: boolean, isValidEnd: boolean): LineItemVirtualType => {
    if (isValidStart && isValidEnd) {
      return 'valid';
    } else if (isValidStart) {
      return 'valid-start';
    } else if (isValidEnd) {
      return 'valid-end';
    } else {
      return 'virtual';
    }
  };

  /**
   * 向当前行添加文本子元素
   */
  addChild(child: TextBlockContentChild, textLength: number, contentRect: DOMRect, isValidStart: boolean = true, isValidEnd: boolean = true): void {
    const startOffset = this._endOffset;
    const virtualType = this._calculateVirtualType(isValidStart, isValidEnd);

    if (['valid', 'valid-end'].includes(virtualType)) {
      assert(textLength !== -1, '文本长度不能为-1,且结束位置必须有效');
    }

    const endOffset = ['valid', 'valid-end'].includes(virtualType)  ? startOffset + textLength : startOffset;

    assert(
      textLength <= getTextBlockContentChildTextLength(child),
      `文本长度超过子元素范围 (${textLength} > ${getTextBlockContentChildTextLength(child)})`
    );

    const item: TextLineItem = {
      type: 'text',
      child,
      startBlockOffset: startOffset,
      endBlockOffset: endOffset,
      contentRect,
      virtualType
    };

    this._items.push(item);
    this._endOffset = endOffset;
  }

  /**
   * 向当前行添加 box 元素
   * @param element box 元素
   * @param contentRect box 的矩形区域
   */
  addBox(element: TextBlockContentChild, contentRect: DOMRect, isValidStart: boolean = true, isValidEnd: boolean = true): void {
    const startOffset = this._endOffset;
    const virtualType = this._calculateVirtualType(isValidStart, isValidEnd);

    const endOffset = ['valid', 'valid-end'].includes(virtualType)  ? startOffset + 1 : startOffset;

    const item: BoxLineItem = {
      type: 'box',
      child: element,
      startBlockOffset: startOffset,
      endBlockOffset: endOffset,
      contentRect,
      virtualType
    };

    this._items.push(item);
    this._endOffset = endOffset;
  }

  addWidget(element: TextBlockContentChild, contentRect: DOMRect,  isValidStart: boolean = true, isValidEnd: boolean = true, indexPosition: 'before' | 'after') {
    const startOffset = this._endOffset;
    const endOffset =  startOffset;
    const virtualType = this._calculateVirtualType(isValidStart, isValidEnd);

    const item: WidgetLineItem = {
      type: 'widget',
      child: element,
      startBlockOffset: startOffset,
      endBlockOffset: endOffset,
      contentRect,
      indexPosition,
      virtualType
    };

    this._items.push(item);
    this._endOffset = endOffset;
  }

  /**
   * 获取行的边界矩形
   */
  getLineRect(): DOMRect {
    if (this._items.length === 0) {
      assert(false, 'TextLine 没有包含任何子元素');
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

  _isValidStart(item: LineItem) {
    if (!('virtualType' in item)) {
      return true;
    }
    return ['valid', 'valid-start'].includes(item.virtualType);
  }

  _isValidEnd(item: LineItem) {
    if (!('virtualType' in item)) {
      return true;
    }
    return ['valid', 'valid-end'].includes(item.virtualType);
  }

  // 获取当前行前序type为 valid 或者 valid-start的item
  _findPreviousValidItem() {
    let item: LineItem | undefined;
    for (let i = this._items.length - 1; i >= 0; i--) {
      const currentItem = this._items[i];
      if (this._isValidStart(currentItem)) {
        item = currentItem;
        break;
      }
    }
    return item;
  }

  _findNextValidItem() {
    let item: LineItem | undefined;
    for (let i = 0; i < this._items.length; i++) {
      const currentItem = this._items[i];
      if (this._isValidEnd(currentItem)) {
        item = currentItem;
        break;
      }
    }
    return item;
  }

  /**
   * 检查偏移量是否在当前行范围内
   */
  containsOffset(offset: number, type: SimpleBlockPositionType = 'middle'): boolean {
    if (this._items.length === 0) {
      return false;
    }

    const firstItem = this._items[0];
    const lastItem = this._items[this._items.length - 1];

    // 检查起始位置
    if (offset === this._startOffset) {
      return this._canPlaceAtStart(firstItem, type);
    }

    // 检查结束位置
    if (offset === this._endOffset) {
      return this._canPlaceAtEnd(lastItem, type);
    }

    // 检查是否在行的中间范围内
    if (offset > this._startOffset && offset < this._endOffset) {
      return this._validateMiddleOffset(offset, firstItem, lastItem);
    }

    return false;
  }

  /**
   * 检查是否可以在行首放置光标
   */
  private _canPlaceAtStart(firstItem: LineItem, type: SimpleBlockPositionType): boolean {
    if (firstItem.type === 'widget') {
      return this._canPlaceAtWidgetStart(firstItem);
    }

    if (type === 'home' || type === 'middle') {
      return (firstItem.type === 'box' || firstItem.type === 'text') && this._isValidStart(firstItem);
    }

    return false;
  }

  /**
   * 检查是否可以在行尾放置光标
   */
  private _canPlaceAtEnd(lastItem: LineItem, type: SimpleBlockPositionType): boolean {
    if (lastItem.type === 'widget') {
      return this._canPlaceAtWidgetEnd(lastItem);
    }

    if (type === 'end' || type === 'middle') {
      if (lastItem.type === 'text') {
        return this._isValidEnd(lastItem);
      }
      if (lastItem.type === 'box') {
        return this._isValidEnd(lastItem) || !!this._findPreviousValidItem();
      }
    }

    return false;
  }

  /**
   * 检查widget位置的起始放置
   */
  private _canPlaceAtWidgetStart(widget: WidgetLineItem): boolean {
    if (widget.indexPosition === 'before' && this._isValidStart(widget)) {
      return true;
    }
    if (widget.indexPosition === 'after') {
      return this._isValidEnd(widget) || !!this._findNextValidItem();
    }
    return false;
  }

  /**
   * 检查widget位置的结束放置
   */
  private _canPlaceAtWidgetEnd(widget: WidgetLineItem): boolean {
    if (widget.indexPosition === 'after' && this._isValidEnd(widget)) {
      return true;
    }
    if (widget.indexPosition === 'before') {
      return this._isValidStart(widget) || !!this._findPreviousValidItem();
    }
    return false;
  }

  /**
   * 验证中间偏移量的有效性
   */
  private _validateMiddleOffset(offset: number, firstItem: LineItem, lastItem: LineItem): boolean {
    // 检查是否在第一个item内部
    if (offset > firstItem.startBlockOffset && offset < firstItem.endBlockOffset) {
      assert(this._isValidStart(firstItem), '第一个item必须有有效的开始位置');
      return true;
    }

    // 检查是否在最后一个item内部
    if (offset > lastItem.startBlockOffset && offset < lastItem.endBlockOffset) {
      assert(this._isValidEnd(lastItem), '最后一个item必须有有效的结束位置');
      return true;
    }

    return true;
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

  private childRectsWeakMap = new WeakMap<TextBlockContentChild, DOMRectList>();

  constructor(block: BlockElement) {
    this._block = block;
    this._blockId = block.id;
    this._parseBlockContent();
    // console.trace('LineBreaker 初始化完成');
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get lines(): readonly TextLine[] {
    return this._lines;
  }

  get blockId(): string {
    return this._blockId;
  }

  get block(): BlockElement {
    return this._block;
  }

  getChildRects(child: TextBlockContentChild): DOMRectList {
    if (!this.childRectsWeakMap.has(child)) {
      const childRects = child.getClientRects();
      this.childRectsWeakMap.set(child, childRects);
    }

    return this.childRectsWeakMap.get(child) as DOMRectList;
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

      if (isMultiLineChild(this.getChildRects(child))) {
        currentLine = this._processMultiLineChild(child, currentLine);
      } else {
        this._processSingleLineChild(child, childLength, currentLine);
      }

      // 检查后续元素是否需要换行
      const nextChild = children[index + 1];
      if (nextChild && doesNextChildStartNewLine(this.getChildRects(child), this.getChildRects(nextChild))) {
        currentLine = this._createNewLine(currentLine.end);
      }
    }
  }

  /**
   * 处理单行子元素
   */
  private _processSingleLineChild(child: TextBlockContentChild, childLength: number, currentLine: TextLine): void {
    const mergedRects = mergeTextRects(this.getChildRects(child));
    assert(mergedRects.length === 1, `期望单行子元素只有一个矩形区域，实际获取到 ${this.getChildRects(child).length} 个`);

    // 检查是否为 widget 元素
    if (isWidgetElement(child)) {
      const indexPosition = getWidgetIndexPosition(child);
      currentLine.addWidget(child, mergedRects[0], true, true, indexPosition);
      return;
    }
    // 检查是否为 box 元素
    if (isBoxWrapper(child)) {
      // box 元素的逻辑长度始终为 1，不使用 childLength
      currentLine.addBox(child, mergedRects[0]);
      return;
    }

    currentLine.addChild(child, childLength, mergedRects[0]);
  }

  /**
   * 通用矩形迭代器，处理多行元素的矩形遍历和换行逻辑
   */
  private _iterateRects<T extends DOMRect[] | DOMRectList>(
    rects: T,
    currentLine: TextLine,
    processRect: (rect: DOMRect, rectIndex: number, currentLine: TextLine) => void
  ): TextLine {
    let resultLine = currentLine;
    const rectArray = Array.from(rects);

    for (let rectIndex = 0; rectIndex < rectArray.length; rectIndex++) {
      const rect = rectArray[rectIndex];
      processRect(rect, rectIndex, resultLine);

      // 检查下一个矩形是否需要换行
      if (rectIndex < rectArray.length - 1) {
        const nextRect = rectArray[rectIndex + 1];
        if (!areRectsOnSameLine(rect, nextRect)) {
          resultLine = this._createNewLine(resultLine.end);
        }
      }
    }

    return resultLine;
  }

  /**
   * 处理多行文本子元素
   */
  private _processMultiLineChild(child: TextBlockContentChild, currentLine: TextLine): TextLine {
    // 检查是否为 widget 元素
    if (isWidgetElement(child)) {
      assert(canWidgetWrap(child), 'widget 元素必须包含 ch-widget-wrap 类名');

      const childRects = this.getChildRects(child);
      const indexPosition = getWidgetIndexPosition(child);
      return this._iterateRects(childRects, currentLine, (rect, rectIndex, currentLine) => {
        const isValidStart = rectIndex === 0;
        const isValidEnd = rectIndex === childRects.length - 1;
        currentLine.addWidget(child, rect, isValidStart, isValidEnd, indexPosition);
      });
    }

    // 检查是否为可跨行的 box 元素
    if (isBoxWrapper(child)) {
      assert(canBoxWrap(child), 'box 元素必须包含 ch-box-wrap 类名');

      const childRects = this.getChildRects(child);
      const totalRects = childRects.length;
      return this._iterateRects(childRects, currentLine, (rect, rectIndex, currentLine) => {
        // box 跨多行时，每行都占用逻辑长度 1，但实际上 box 的总逻辑长度仍为 1
        // 这里需要特殊处理：第一行添加 box，后续行标记为无效索引
        const isValidStart = rectIndex === 0;
        const isValidEnd = rectIndex === totalRects - 1;
        currentLine.addBox(child, rect, isValidStart, isValidEnd);

        return currentLine;
      });
    }

    // 处理普通多行文本元素
    const textNode = child.firstChild;
    assert(textNode instanceof Text, `多行子元素应包含文本节点，实际类型为 ${typeof textNode}`);

    const textRects = getTextNodeRects(textNode);
    let processedOffset = 0;
    let isPreRightOffsetValid = true; // 上一行的最后一个位置是否有效

    return this._iterateRects(textRects, currentLine, (rect, rectIndex, currentLine) => {
      let offsetInfo = getOffsetFromPoint(textNode, rect.right - 1, rect.bottom - 1, true);
      if (offsetInfo.offset ===  -1 && rectIndex < textRects.length - 1) {
        const nextRect = textRects[rectIndex + 1];
        offsetInfo = getOffsetFromPoint(textNode, nextRect.left + 1, nextRect.bottom - 1, true);
      }

      // 精准定位，通常位于视口内
      if (offsetInfo.offset !== -1) {
        assert(offsetInfo.textNode === textNode, '偏移量计算应返回同一文本节点');

        if (isPreRightOffsetValid) {
          currentLine.addChild(child, offsetInfo.offset - processedOffset, rect);
          processedOffset = offsetInfo.offset;
        } else {
          // 尝试计算当前行的起始位置
          currentLine.addChild(child, offsetInfo.offset, rect, false, true);
          processedOffset = offsetInfo.offset;
        }

        isPreRightOffsetValid = true;
        return currentLine;
      }
      // 非精准定位，通常位于视口外
      if (rectIndex === 0) {
        currentLine.addChild(child, -1, rect, true, false);
      } else if (rectIndex === textRects.length - 1) {
        // 直接使用计算值
        const len = textNode.length - processedOffset;
        currentLine.addChild(child, len, rect, false, true);
      } else {
        currentLine.addChild(child, -1, rect, false, false);
      }

      isPreRightOffsetValid = false;
      return currentLine;
    });
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

    // if (line.items.length === 0) {
    //   // 空行，返回块的左边界
    //   const blockRect = this._block.getBoundingClientRect();
    //   return new DOMRect(blockRect.left, blockRect.top, blockRect.width, 20); // 默认行高
    // }

    return line.getLineRect();
  }

  /**
   * 根据坐标获取位置信息（双向检索：坐标 -> 偏移量）
   */
  getPositionFromPoint(x: number, y: number): SimpleBlockPosition {
    // 首先确定在哪一行
    let targetLineIndex = -1;
    for (const [lineIndex] of this._lines.entries()) {
      const lineRect = this.getLineRect(lineIndex);
      if (y >= lineRect.top && y <= lineRect.bottom) {
        targetLineIndex = lineIndex;
        break;
      }
    }

    // 如果没有找到精确匹配的行，找最接近的行
    if (targetLineIndex === -1) {
      let minDistance = Infinity;
      for (const [lineIndex] of this._lines.entries()) {
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
        // 处理文本类型的 item
        if (isTextLineItem(item)) {
          const textNode = item.child.firstChild;
          if (textNode instanceof Text) {
            const offsetInfo = getOffsetFromPoint(textNode, x, y, false);

            if (offsetInfo.textNode === textNode && offsetInfo.offset >= 0) {
              const relativeOffset = offsetInfo.offset;
              const startBlockOffset = this._findFirstItemForChild(item.child).startBlockOffset;
              const absoluteOffset = startBlockOffset + relativeOffset;

              // 对于文本元素，type 始终为 'middle'
              // home 和 end 仅用于标识多行文本换行处的索引位置
              const type: SimpleBlockPositionType = 'middle';

              return {
                offset: Math.min(absoluteOffset, item.endBlockOffset),
                type,
                blockId: this._blockId
              };
            }
          }

          // 如果无法精确计算，根据x坐标判断是开始还是结束
          // const midX = rect.left + rect.width / 2;
          // if (x < midX) {
          //   return { offset: item.startBlockOffset, type: 'home', blockId: this._blockId };
          // } else {
          //   return { offset: item.endBlockOffset, type: 'end', blockId: this._blockId };
          // }
        }

        // 处理 box 类型的 item
        if (isBoxLineItem(item)) {
          if (item.virtualType === 'valid-end') {
            return { offset: item.endBlockOffset, type: 'middle', blockId: this._blockId };
          } else {
            return { offset: item.startBlockOffset, type: 'middle', blockId: this._blockId };
          }
        }

        // 处理 widget 类型的 item
        if (isWidgetLineItem(item)) {
          return { offset: item.endBlockOffset, type: 'middle', blockId: this._blockId };
        }
      }
    }

    // 如果没有在任何item内，判断是在行首还是行尾
    // if (targetLine.items.length === 0) {
    //   return { offset: targetLine.start, type: 'home', blockId: this._blockId };
    // }

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

  findNextWidgetItem(line: TextLine, item: LineItem): WidgetLineItem | undefined {
    const currentLineIndex = this._lines.indexOf(line);
    if (currentLineIndex === -1) {
      return undefined;
    }

    const currentItemIndex = line.items.indexOf(item);
    if (currentItemIndex === -1) {
      return undefined;
    }

    // 从当前行的当前item之后开始查找
    const result = this._searchWidgetInLines(currentLineIndex, currentItemIndex + 1, item.child);
    return result;
  }

  private _searchWidgetInLines(startLineIndex: number, startItemIndex: number, targetChild: TextBlockContentChild): WidgetLineItem | undefined {
    for (let lineIndex = startLineIndex; lineIndex < this._lines.length; lineIndex++) {
      const currentLine = this._lines[lineIndex];
      const itemStartIndex = lineIndex === startLineIndex ? startItemIndex : 0;

      for (let itemIndex = itemStartIndex; itemIndex < currentLine.items.length; itemIndex++) {
        const currentItem = currentLine.items[itemIndex];

        if (isWidgetLineItem(currentItem) &&
            (currentItem.virtualType === 'valid' || currentItem.virtualType === 'valid-end')) {
          return currentItem;
        }

        // 如果遇到不同child的item，停止在当前行的查找
        if (currentItem.child !== targetChild) {
          return undefined;
        }
      }
    }

    return undefined;
  }

  /**
   * 获取下一个widget的位置矩形，用于复用代码
   */
  private _getNextWidgetRect(line: TextLine, item: LineItem, fallbackRect: DOMRect): DOMRect {
    const nextWidgetItem = this.findNextWidgetItem(line, item);
    if (nextWidgetItem) {
      return new DOMRect(
        nextWidgetItem.contentRect.right,
        nextWidgetItem.contentRect.top,
        1,
        nextWidgetItem.contentRect.height
      );
    }
    return fallbackRect;
  }
  /**
   * 根据偏移量获取矩形位置（双向检索：偏移量 -> 坐标）
   */
  getCaretRect(position: SimpleBlockPosition): DOMRect {
    const line = this.getLine(position);

    for (const item of line.items) {
      if (position.offset === item.startBlockOffset) {
        const contentRect = item.contentRect;
        const fallbackRect = new DOMRect(contentRect.left, contentRect.top, 1, contentRect.height);
        return this._getNextWidgetRect(line, item, fallbackRect);
      }

      if (position.offset === item.endBlockOffset) {
        const contentRect = item.contentRect;
        const fallbackRect = new DOMRect(contentRect.right, contentRect.top, 1, contentRect.height);
        return this._getNextWidgetRect(line, item, fallbackRect);
      }

      // 处理文本类型的 item
      if (position.offset > item.startBlockOffset && position.offset < item.endBlockOffset) {
        const textNode = item.child.firstChild;
        assert(textNode instanceof Text, `无效的文本子节点，不是有效的文本节点: ${typeof textNode}`);

        // 查找同一元素的第一个lineItem，获取真实的起始偏移量
        const firstItem = this._findFirstItemForChild(item.child);
        const realStartOffset = firstItem ? firstItem.startBlockOffset : item.startBlockOffset;
        const relativeOffset = position.offset - realStartOffset;

        const range = createExpandedRange(textNode, relativeOffset, textNode, relativeOffset);
        const rects = range.getClientRects();

        // TODO: 直接拿第一个，如果在断行处不会有问题吗
        if (rects.length > 0) {
          const contentRect = rects[0];
          return new DOMRect(contentRect.left, contentRect.top, 1, contentRect.height);
        }
      }
    }

    assert(false, '未找到目标位置的矩形');
  }

  /**
   * 查找同一元素的第一个lineItem，获取真实的起始偏移量
   */
  private _findFirstItemForChild(targetChild: TextBlockContentChild): TextLineItem {
    for (const line of this._lines) {
      for (const item of line.items) {
        if (isTextLineItem(item) && item.child === targetChild) {
          return item;
        }
      }
    }

    assert(false, '未找到目标元素的第一个lineItem');
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

        if (overlapStart > overlapEnd) {
          continue;
        }

        // 如果整个 item 都被选中
        if (overlapStart === itemStart && overlapEnd === itemEnd) {
          rects.push(item.contentRect);
          continue;
        }

        // 处理文本类型的部分选中
        if (isTextLineItem(item)) {
          const textNode = item.child.firstChild;
          if (textNode instanceof Text) {
            // 查找同一元素的第一个lineItem，获取真实的起始偏移量
            const firstItem = this._findFirstItemForChild(item.child);
            const realStartOffset = firstItem.startBlockOffset;

            const relativeStart = overlapStart - realStartOffset;
            const relativeEnd = overlapEnd - realStartOffset;

            const range = createExpandedRange(textNode, relativeStart, textNode, relativeEnd);
            const rangeRects = range.getClientRects();
            for (let i = 0; i < rangeRects.length; i++) {
              rects.push(rangeRects[i]);
            }
          } else {
            // 非文本节点，使用整个 item 的矩形
            rects.push(item.contentRect);
          }
        } else if (isBoxLineItem(item)) {
          // 处理 box 类型的选中
          // box 被选中时，直接使用其完整的矩形区域
          rects.push(item.contentRect);
        } else if (isWidgetLineItem(item)) {
          // 处理 widget 类型的选中
          // widget 被选中时，直接使用其完整的矩形区域
          rects.push(item.contentRect);
        }
      }
    }

    return rects;
  }
}

/**
 * 获取文本光标矩形位置
 * @param block 块元素
 * @param pos 简单块位置
 * @returns 光标的DOMRect
 */
export function getTextCaretRect(block: BlockElement, pos: SimpleBlockPosition, lineBreaker?: LineBreaker): DOMRect {
  lineBreaker = assertLineBreaker(block, lineBreaker);
  return lineBreaker.getCaretRect(pos);
}

/**
 * 从坐标点获取块位置
 * @param block 块元素
 * @param x x坐标
 * @param y y坐标
 * @returns 简单块位置
 */
export function getPositionFromPoint(block: BlockElement, x: number, y: number, lineBreaker?: LineBreaker): SimpleBlockPosition {
  lineBreaker = assertLineBreaker(block, lineBreaker);
  return lineBreaker.getPositionFromPoint(x, y);
}

/**
 * 获取行分割器实例（缓存优化可以在这里实现）
 * @param block 块元素
 * @returns LineBreaker实例
 */
export function assertLineBreaker(block: BlockElement, lineBreakerOrMap?: LineBreaker | WeakMap<BlockElement, LineBreaker>): LineBreaker {
  if (lineBreakerOrMap instanceof WeakMap) {
    let lineBreaker = lineBreakerOrMap.get(block);
    if (!lineBreaker) {
      lineBreaker = new LineBreaker(block);
      lineBreakerOrMap.set(block, lineBreaker);
    }
    assert(lineBreaker.block === block, 'lineBreakerOrMap block not match');
    return lineBreaker;
  };

  if (!lineBreakerOrMap) {
    lineBreakerOrMap = new LineBreaker(block);
  };
  assert(lineBreakerOrMap.block === block, 'lineBreakerOrMap block not match');
  return lineBreakerOrMap;
}

(window as any).LineBreaker = LineBreaker;
