import { createBackgroundChild, getBlockBackground, removeBackgrounds } from "../block/block-dom";
import { Editor } from "../editor/editor";
import { getTextBlockContentChildren } from "../selection/offset-rect";
import { assert } from "../utils/assert";
import { createExpandedRange } from "../utils/dom";


export function updateSelection(editor: Editor, block: HTMLElement, from: number, to: number) {
  const children = getTextBlockContentChildren(block);

  if(from === to) {
    removeBackgrounds(block);
    return;
  }
  let start = 0;
  const childRect: DOMRect[] = []
  children.forEach((child, index) => {

    assert(child.firstChild, 'child.firstChild is null');

    const childLen = child.firstChild.textContent?.length || 0;
    if(from > start + childLen) {
      start += childLen;
      return;
    }
    
    const childAnchor = Math.max(from - start, 0);
    let childFocus = 0;
    if(to > start + childLen) {
      childFocus = start + childLen - from;
    } else {
      const len = to - from;
      childFocus = Math.max(len + childAnchor, childAnchor) ;
    }
    const range = createExpandedRange(child.firstChild, childAnchor, child.firstChild, childFocus);
    Array.from(range.getClientRects()).forEach(rect => {
      childRect.push(rect)
    })

  });

  const background = getBlockBackground(block);
  removeBackgrounds(block);
  const blockRect = block.getBoundingClientRect();
  const left = blockRect.left
  const top = blockRect.top
  childRect.forEach(rect => {
    createBackgroundChild(background, new DOMRect(rect.left - left, rect.top - top, rect.width, rect.height))
  })

  console.log('updateSelection', block, from, to, childRect)
}