import { getParentScrollContainer } from './dom';
import { EditorBlockPosition } from '../selection/block-position';
import { Editor } from '../editor/editor';
import { getBlockType } from '../block/block-dom';

/**
 * 滚动行为类型
 */
export type ScrollBehavior = 'auto' | 'smooth';

/**
 * 滚动逻辑位置类型
 */
export type ScrollLogicalPosition = 'start' | 'center' | 'end' | 'nearest';

export interface ScrollIntoViewOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  margin?: number;
}

/**
 * 智能滚动到光标位置
 * 参考 Monaco Editor 和 CodeMirror 的实现
 *
 * @param editor 编辑器实例
 * @param position 目标位置
 * @param options 滚动选项
 */
export function scrollIntoView(editor: Editor, position: EditorBlockPosition, options: ScrollIntoViewOptions = {}): void {
  const { behavior = 'smooth', block = 'nearest', inline = 'nearest', margin = 20 } = options;

  const targetBlock = editor.getBlockById(position.blockId);
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(targetBlock));

  // 获取光标在块中的坐标
  const cursorRect = blockClass.getCursorRect(targetBlock, position);

  // 查找滚动容器
  const scrollContainer = getParentScrollContainer(editor.rootContainer);
  if (!scrollContainer) {
    console.warn('未找到滚动容器');
    return;
  }

  // 计算需要滚动的距离
  const scrollOffset = calculateScrollOffset(cursorRect, scrollContainer, { block, inline, margin });

  if (scrollOffset.x !== 0 || scrollOffset.y !== 0) {
    // 执行滚动
    if (behavior === 'smooth') {
      smoothScrollTo(scrollContainer, scrollOffset);
    } else {
      scrollContainer.scrollLeft += scrollOffset.x;
      scrollContainer.scrollTop += scrollOffset.y;
    }
  }
}

/**
 * 计算滚动偏移量
 */
function calculateScrollOffset(
  cursorRect: DOMRect,
  scrollContainer: Element,
  options: { block: ScrollLogicalPosition; inline: ScrollLogicalPosition; margin: number }
): { x: number; y: number } {
  const containerRect = scrollContainer.getBoundingClientRect();
  const { margin } = options;

  let offsetX = 0;
  let offsetY = 0;

  // 计算垂直滚动偏移
  switch (options.block) {
  case 'start':
    offsetY = cursorRect.top - containerRect.top - margin;
    break;
  case 'center':
    offsetY = cursorRect.top - containerRect.top - containerRect.height / 2 + cursorRect.height / 2;
    break;
  case 'end':
    offsetY = cursorRect.bottom - containerRect.bottom + margin;
    break;
  case 'nearest':
  default:
    // 只有当光标不在可视区域内时才滚动
    if (cursorRect.top < containerRect.top + margin) {
      offsetY = cursorRect.top - containerRect.top - margin;
    } else if (cursorRect.bottom > containerRect.bottom - margin) {
      offsetY = cursorRect.bottom - containerRect.bottom + margin;
    }
    break;
  }

  // 计算水平滚动偏移
  switch (options.inline) {
  case 'start':
    offsetX = cursorRect.left - containerRect.left - margin;
    break;
  case 'center':
    offsetX = cursorRect.left - containerRect.left - containerRect.width / 2 + cursorRect.width / 2;
    break;
  case 'end':
    offsetX = cursorRect.right - containerRect.right + margin;
    break;
  case 'nearest':
  default:
    // 只有当光标不在可视区域内时才滚动
    if (cursorRect.left < containerRect.left + margin) {
      offsetX = cursorRect.left - containerRect.left - margin;
    } else if (cursorRect.right > containerRect.right - margin) {
      offsetX = cursorRect.right - containerRect.right + margin;
    }
    break;
  }

  return { x: offsetX, y: offsetY };
}

/**
 * 平滑滚动实现
 * 使用 requestAnimationFrame 实现自定义平滑滚动
 */
function smoothScrollTo(container: Element, offset: { x: number; y: number }, duration: number = 300): void {
  const startTime = performance.now();
  const startScrollLeft = container.scrollLeft;
  const startScrollTop = container.scrollTop;

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用 easeOutCubic 缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    container.scrollLeft = startScrollLeft + offset.x * easeProgress;
    container.scrollTop = startScrollTop + offset.y * easeProgress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 检查元素是否在视口内
 */
export function isElementInViewport(element: Element, container: Element, margin: number = 0): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    elementRect.top >= containerRect.top - margin &&
    elementRect.left >= containerRect.left - margin &&
    elementRect.bottom <= containerRect.bottom + margin &&
    elementRect.right <= containerRect.right + margin
  );
}

/**
 * 快速检查光标是否需要滚动
 * 用于性能优化，避免不必要的滚动计算
 */
export function shouldScrollToPosition(editor: Editor, position: EditorBlockPosition, margin: number = 20): boolean {
  const targetBlock = editor.getBlockById(position.blockId);
  const scrollContainer = getParentScrollContainer(editor.rootContainer);

  if (!scrollContainer) {
    return false;
  }

  return !isElementInViewport(targetBlock, scrollContainer, margin);
}
