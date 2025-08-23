import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from '../editor/editor';
import { addClass, createElement } from '../utils/dom';
import { isEmptyBlockText } from './text-utils';

import { BlockPath, DocBlockText } from '../index.type';

export function updateBlockContent(editor: Editor, path: BlockPath, blockId: string, content: Element, blockText: DocBlockText) {

  if (isEmptyBlockText(blockText)) {
    content.innerHTML = '<span><br></span>';
    return;
  }

  const fragment = document.createDocumentFragment();

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
      });

      // bind
      addClass(span, ...classes);
      Object.entries(newAttributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

    }

    fragment.appendChild(span);
  }

  content.innerHTML = '';
  content.appendChild(fragment);

}
