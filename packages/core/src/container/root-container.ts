import { assert } from '../utils/assert';
import { Editor } from '../editor/editor';
import { getBlockType, getParentBlock } from '../block/block-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { editorGetNextWordEnd, editorGetPreWordStart } from '../editor/actions/utils';
import { isTextKindBlock } from '../editor/editor-blocks';
import { ContainerElement } from '../index.type';
import { getParentScrollContainer } from '../utils/dom';

export class RootContainer {
  private isDragging = false;
  private dragStartPos: EditorBlockPosition | null = null;
  private lastMouseMoveTime = 0;
  private mouseMoveThrottleDelay = 16; // ~60fps
  private autoScrollTimer: number | null = null;
  private scrollContainer: Element | null = null;
  private scrollDirection = 0;

  constructor(private editor: Editor, public rootContainer: ContainerElement) {
    rootContainer.addEventListener('mousedown', this.handleMouseDown);
    rootContainer.addEventListener('dblclick', this.handleDoubleClick);
    rootContainer.addEventListener('mousemove', this.handleMouseMove);
    rootContainer.addEventListener('mouseup', this.handleMouseUp);
    rootContainer.addEventListener('mouseleave', this.handleMouseLeave);
  }

  handleMouseDown = (e: MouseEvent) => {
    const { clientX, clientY } = e;

    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);
    if (!block) {
      // TODO:计算padding区域，重新矫正x, y
      this.editor.focus(false);
      return;
    }

    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const pos = blockClass.getRangeFormPoint(block, clientX, clientY);
    const startPos = new EditorBlockPosition(block.id, pos.offset, pos.type);

    // 初始化拖拽状态
    this.isDragging = true;
    this.dragStartPos = startPos;

    // 设置初始选区（光标位置）
    this.editor.selection.setSelection(startPos, startPos);

    // 阻止默认的文本选择行为
    e.preventDefault();
  };

  handleDoubleClick = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);

    if (!block) {
      return;
    }

    // 检查是否为文本类型的块
    if (!isTextKindBlock(this.editor, block)) {
      return;
    }

    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const pos = blockClass.getRangeFormPoint(block, clientX, clientY);

    // 获取块的文本数据
    const blockData = this.editor.getBlockData(block);
    const blockLen = blockClass.getBlockTextLength(block);
    const currentOffset = pos.offset;

    assert(blockData.text, 'no text');
    // 使用分词算法找到单词的开始和结束位置
    let wordStart = editorGetPreWordStart(blockData.text, currentOffset);
    let wordEnd = editorGetNextWordEnd(blockData.text, currentOffset, blockLen);

    // 处理边界情况
    if (wordStart === -1) {
      wordStart = 0;
    }
    if (wordEnd === -1) {
      wordEnd = blockLen;
    }

    // 确保索引有效且形成有效选区
    assert(wordStart <= wordEnd, 'invalid range');
    assert(wordStart >= 0, 'invalid range');
    assert(wordEnd <= blockLen, 'invalid range');

    // 如果开始和结束位置相同，选择当前字符
    if (wordStart === wordEnd && wordEnd < blockLen) {
      wordEnd = wordStart + 1;
    }

    // 创建选区
    const startPos = new EditorBlockPosition(block.id, wordStart);
    const endPos = new EditorBlockPosition(block.id, wordEnd);

    // 设置选区
    this.editor.selection.setSelection(startPos, endPos);
  };

  handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.dragStartPos) {
      return;
    }

    // 节流处理，减少频繁的选区更新
    const now = Date.now();
    if (now - this.lastMouseMoveTime < this.mouseMoveThrottleDelay) {
      return;
    }
    this.lastMouseMoveTime = now;

    const { clientX, clientY } = e;

    // 检查是否需要自动滚动
    this.handleAutoScroll(clientY);

    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);

    if (!block) {
      return;
    }

    // 检查是否为文本类型的块
    if (!isTextKindBlock(this.editor, block)) {
      return;
    }

    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const currentPos = blockClass.getRangeFormPoint(block, clientX, clientY);
    const endPos = new EditorBlockPosition(block.id, currentPos.offset, currentPos.type);

    // 更新选区
    this.editor.selection.setSelection(this.dragStartPos, endPos);
  };

  handleMouseUp = (e: MouseEvent) => {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartPos = null;
      this.clearAutoScroll();
    }
  };

  handleMouseLeave = (e: MouseEvent) => {
    // 当鼠标离开编辑器区域时，停止拖拽
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartPos = null;
      this.clearAutoScroll();
    }
  };

  /**
   * 处理自动滚动功能
   * 当鼠标接近滚动容器边缘时自动滚动
   */
  private handleAutoScroll = (clientY: number) => {
    // 查找真正的滚动容器
    const scrollContainer = getParentScrollContainer(this.rootContainer);
    if (!scrollContainer) {
      return; // 没有找到滚动容器，不需要自动滚动
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const scrollThreshold = 50; // 距离边缘50px时开始滚动
    const scrollSpeed = 5; // 滚动速度

    let shouldScroll = false;
    let newScrollDirection = 0;

    // 检查是否接近顶部边缘
    if (clientY - containerRect.top < scrollThreshold) {
      shouldScroll = true;
      newScrollDirection = -scrollSpeed;
    }
    // 检查是否接近底部边缘
    else if (containerRect.bottom - clientY < scrollThreshold) {
      shouldScroll = true;
      newScrollDirection = scrollSpeed;
    }

    if (shouldScroll && !this.autoScrollTimer) {
      this.scrollContainer = scrollContainer;
      this.scrollDirection = newScrollDirection;
      this.startAutoScroll();
    } else if (!shouldScroll && this.autoScrollTimer) {
      this.clearAutoScroll();
    }
  };

  /**
   * 使用 requestAnimationFrame 开始自动滚动
   * RAF 比 setInterval 性能更好，与浏览器刷新率同步
   */
  private startAutoScroll = () => {
    const scroll = () => {
      if (this.scrollContainer && this.scrollDirection !== 0) {
        this.scrollContainer.scrollTop += this.scrollDirection;
        this.autoScrollTimer = requestAnimationFrame(scroll);
      }
    };
    this.autoScrollTimer = requestAnimationFrame(scroll);
  };

  /**
   * 清除自动滚动
   */
  private clearAutoScroll = () => {
    if (this.autoScrollTimer) {
      cancelAnimationFrame(this.autoScrollTimer);
      this.autoScrollTimer = null;
      this.scrollContainer = null;
      this.scrollDirection = 0;
    }
  };

  destroy() {
    // 清理事件监听器
    this.rootContainer.removeEventListener('mousedown', this.handleMouseDown);
    this.rootContainer.removeEventListener('dblclick', this.handleDoubleClick);
    this.rootContainer.removeEventListener('mousemove', this.handleMouseMove);
    this.rootContainer.removeEventListener('mouseup', this.handleMouseUp);
    this.rootContainer.removeEventListener('mouseleave', this.handleMouseLeave);

    // 清理定时器和状态
    this.clearAutoScroll();
    this.isDragging = false;
    this.dragStartPos = null;
  }
}
