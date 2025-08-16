import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from "../editor/editor";
import { addClass, createElement } from "../utils/dom";

import { BlockPath, DocBlockText } from "../index.type";

function multiSplitText(ops: DocBlockText, offsets: number[]) {
  const newOffsets = Array.from(new Set(offsets)).sort((n1, n2) => n1 - n2)
}


const isEmptyBlockText = (blockText: DocBlockText) => {
  return !blockText.length ||  (blockText.length === 1 && !blockText[0].insert);
}

export function updateBlockContent(editor: Editor, path: BlockPath, blockId: string, content: Element, blockText: DocBlockText) {

  if (isEmptyBlockText(blockText)) {
    content.innerHTML = `<span><br></span>`;
    return;
  }

  const offsets = [];
  //
  const fragment = document.createDocumentFragment();
  let offset = 0;
  // const parts = multiSplitText(blockText, offset);

  for (let i = 0; i < blockText.length; i++) {
    const op = blockText[i];

    const span = createElement('span', ['text'], fragment);
    span.innerText = op.insert;

    if (op.attributes) {
      const classes: string[] = [];
      const newAttributes: AttributeMap = {};

      Object.entries(op.attributes).forEach(([key, value]) => {
        if (value === true) {
          const COLOR_PREFIX = 'style-color-';
          // const BKG_COLOR_PREFIX = ''
          if (key.startsWith(COLOR_PREFIX)) {
            newAttributes['data-style-color'] = key.substring(COLOR_PREFIX.length);
          } else if (key.startsWith('style')) {
            classes.push(key);
          }
        }
      })

      // bind
      addClass(span, ...classes);
      Object.entries(newAttributes).forEach(([key, value]) => {
        span.setAttribute(key, value)
      })

    }

    fragment.appendChild(span)
  }

  content.innerHTML = '';
  content.appendChild(fragment);

}
