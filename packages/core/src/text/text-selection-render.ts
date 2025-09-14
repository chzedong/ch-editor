import { getBlockBackground, createBackgroundChild, removeBackgrounds } from './text-dom';
import { BlockElement } from '../index.type';
import { assertLineBreaker, LineBreaker } from './line/text-line';
import { Editor } from '../editor/editor';

export function updateSelection(editor: Editor, block: BlockElement, from: number, to: number, lineBreaker?: LineBreaker): void {
  const isCollapsed = editor.selection.range.isCollapsed();

  if (isCollapsed && from === to) {
    removeBackgrounds(block);
    return;
  }

  lineBreaker = assertLineBreaker(block, lineBreaker);
  const rects = lineBreaker.getSelectionRects(from, to);
  const blockRect = block.getBoundingClientRect();

  editor.selection.scheduleDomOperation(() => {
    const background = getBlockBackground(block);
    removeBackgrounds(block);
    const left = blockRect.left;
    const top = blockRect.top;
    rects.forEach((rect) => {
      createBackgroundChild(background, new DOMRect(rect.left - left, rect.top - top, rect.width, rect.height));
    });
  });
}
