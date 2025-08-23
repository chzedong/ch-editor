import { Editor } from '../editor/editor';
import { loadBlocks } from './load-block';
import { RootContainer } from './root-container';
import { createElement } from '../utils/dom';
import { ContainerElement } from '../index.type';

export const createRootContainer = (editor: Editor) => {
  const container = createElement('div', ['root'], editor.parent) as ContainerElement;
  container.setAttribute('data-type', 'editor-container');
  container.setAttribute('data-container-id', 'root');
  //
  createElement('div', ['container-blocks'], container);
  editor.rootContainer = container;
  loadBlocks(editor, container, []);
  return new RootContainer(editor, container);
};
