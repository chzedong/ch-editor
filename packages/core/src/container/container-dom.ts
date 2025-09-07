import { Editor } from '../editor/editor';
import { createElement } from '../utils/dom';
import { assert } from '../utils/assert';
import './container.scss';

import { BlockElement, ContainerElement } from '../index.type';

export function getContainerBlocksElement(container: ContainerElement) {
  return container.querySelector(':scope > .container-blocks') as HTMLElement;
}

export const getParentContainer = (block: BlockElement) => {
  const container = block.closest('div[data-type=editor-container]');
  assert(container, 'failed to get block container');
  return container as ContainerElement;
};

export const getChildBlocks = (container: ContainerElement) => {
  const blocks = container.querySelectorAll(':scope > .container-blocks > div[data-type=editor-block]');
  return Array.from(blocks) as BlockElement[];
};

export const getContainerId = (container: ContainerElement) => {
  const id = container.getAttribute('data-container-id');
  assert(id, '容器ID不存在');
  return id;
};

export const getContainerById = (editor: Editor, id: string) => {
  const rootId = getContainerId(editor.rootContainer);
  if (rootId === id) {
    return editor.rootContainer;
  }
  const container = editor.rootContainer.querySelector(`div[data-container-id=${id}]`);
  assert(container, 'no container');
  return container as ContainerElement;
};

export const createContainerElement = (id: string): ContainerElement => {
  const container = createElement('div', [], null);
  container.setAttribute('data-container-id', id);
  container.setAttribute('data-type', 'editor-container');

  return container;
};
