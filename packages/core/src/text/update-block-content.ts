import { Editor } from '../editor/editor';
import { createElement } from '../utils/dom';
import { isEmptyBlockText } from './text-utils';
import { BoxDomUtils } from '../box/box-dom-utils';
import { isBoxOp, isTextOp } from '../box/box-data-model';

import { BlockPath, DocBlockText } from '../index.type';

export function updateBlockContent(editor: Editor, path: BlockPath, blockId: string, content: Element, blockText: DocBlockText) {
  if (isEmptyBlockText(blockText)) {
    content.innerHTML = '<span><br></span>';
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < blockText.length; i++) {
    const op = blockText[i];

    // 检查是否为 box 操作
    if (isBoxOp(op)) {
      // 渲染 box 元素
      const boxData = op.insertBox;

      // 通过 editor-boxes 渲染 box 内容
      const { boxContent, canWrap } = editor.editorBoxes.renderBox(boxData);

      // 使用 BoxDomUtils 创建标准的 box 包装器
      const boxElement = BoxDomUtils.createBoxWrapper(boxData, boxContent, canWrap);

      fragment.appendChild(boxElement);
    } else if (isTextOp(op)) {
      // 渲染文本元素
      const span = createElement('span', ['text'], fragment);
      span.innerText = op.insert;

      if (op.attributes) {
        // 使用插件化的mark系统渲染样式
        editor.markManager.applyMarks(span, op.attributes);
      }

      fragment.appendChild(span);
    }
  }

  content.innerHTML = '';
  content.appendChild(fragment);
}
