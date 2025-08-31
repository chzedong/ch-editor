import { getBlockBackground } from '../block/block-background';
import { createBackgroundChild, removeBackgrounds } from '../block/block-background';
import { BlockElement } from '../index.type';
import { Editor } from '../editor/editor';

export function updateSelection(editor: Editor, block: BlockElement, from: number, to: number): void {
  const isCollapsed = editor.selection.range.isCollapsed();

  if (isCollapsed && from === to) {
    removeBackgrounds(block);
    return;
  }

  const lineBreaker = editor.lineBreakerCache.getLineBreaker(block);
  const rects = lineBreaker.getSelectionRects(from, to);

  const background = getBlockBackground(block);
  removeBackgrounds(block);
  const blockRect = block.getBoundingClientRect();
  const left = blockRect.left;
  const top = blockRect.top;
  rects.forEach((rect) => {
    createBackgroundChild(background, new DOMRect(rect.left - left, rect.top - top, rect.width, rect.height));
  });
}
