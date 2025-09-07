import { Editor } from '../editor/editor';
import { createContainerElement, getContainerBlocksElement } from './container-dom';
import { RootContainer } from './root-container';
import { createElement } from '../utils/dom';

import { ContainerElement } from '../index.type';

export const createRootContainer = (editor: Editor) => {
  const container = createContainerElement('root');
  // 根容器添加类名
  container.classList.add('root');
  editor.parent.appendChild(container);

  // 容器渲染管线
  createElement('div', ['container-blocks'], container);
  editor.rootContainer = container;
  loadBlocks(editor, container, 'root');
  return new RootContainer(editor, container);
};

/**
 * 加载容器下的所有块
 */
export function loadBlocks(editor: Editor, container: ContainerElement, containerId: string) {
  const blocks = editor.editorDoc.getContainerBlocks(containerId);
  const fragment = document.createDocumentFragment();

  blocks.forEach((block, index) => {
    const blockElement = editor.editorBlocks.createBlock([{ containerId, blockIndex: index }], container, block);
    fragment.appendChild(blockElement);
  });

  const containerBlocksElement = getContainerBlocksElement(container);
  containerBlocksElement.appendChild(fragment);
}

