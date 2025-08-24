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
      // 使用插件化的mark系统渲染样式
      editor.markManager.applyMarks(span, op.attributes);
    }

    fragment.appendChild(span);
  }

  content.innerHTML = '';
  content.appendChild(fragment);

}
