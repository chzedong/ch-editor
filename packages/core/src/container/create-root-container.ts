import { Editor } from '../editor/editor';
import { loadBlocks } from './load-block';
import { RootContainer } from './root-container';
import { createElement } from '../utils/dom';
import { createContainerElement } from './container-dom';

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
