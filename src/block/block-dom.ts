import { Editor } from '../editor/editor';
import { getChildBlocks, getParentContainer } from '../container/container-dom';
import { createElement } from '../utils/dom';
import { assert } from '../utils/assert';
import './block.scss';

import { BlockPath, DocBlock } from '../index.type';

export function createBlockElement(editor: Editor, path: BlockPath, data: DocBlock): HTMLElement {
  const elem = createElement('div', [`${data.type}-block`], null);
  elem.id = data.id;
  elem.setAttribute('data-type', 'editor-block');
  elem.setAttribute('data-block-type', data.type);

  return elem;
}

export function getBlockId(block: HTMLElement) {
  assert(block.id, 'id is required');
  return block.id;
}

export function getBlockType(block: HTMLElement) {
  const type = block.getAttribute('data-block-type');
  assert(type, 'type is required');
  return type;
}

export function getBlockContent(block: HTMLElement) {
  const content = block.querySelector(':scope >div[data-type=block-content]');
  assert(content, 'no block content');
  return content;
}

export function getBlockIndex(block: HTMLElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  assert(index !== -1, 'invalid block');
  return index;
}

export function getParentBlock(node: HTMLElement) {
  const block = node.closest('[data-type=editor-block]');
  return block as HTMLElement | null;
}

export function isLastBlock(block: HTMLElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);

  assert(index !== -1, 'invalid block');

  return index === children.length - 1;
}

export function isFirstBlock(block: HTMLElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);

  assert(index !== -1, 'invalid block');

  return index === 0;
}

export function isBlock(node: HTMLElement) {
  return node.getAttribute('data-type') === 'editor-block';
}

export function getLastBlock(container: HTMLElement) {
  const children = getChildBlocks(container);

  return children[children.length - 1];
}

export function getFirstBlock(container: HTMLElement) {
  const children = getChildBlocks(container);

  return children[0];
}

export function getBlockBackground(block: HTMLElement) {
  let bgElem = block.querySelector(':scope >div[data-type=block-background]');
  if(!bgElem) {
    bgElem = createElement('div', [], block);
    bgElem.setAttribute('data-type', 'block-background');
  }
  return bgElem as HTMLElement;
}


export function removeBackgrounds(block: HTMLElement) {
  const bgElem = block.querySelector(':scope >div[data-type=block-background]');
  if(bgElem) {
    Array.from(bgElem.children).forEach(child => child.remove());
  }
}

export function createBackgroundChild(background: HTMLElement, rect: DOMRect) {
  const bkgChild = createElement('div', ['background'], background);
  bkgChild.style.top = `${rect.top}px`;
  bkgChild.style.left = `${rect.left}px`;
  bkgChild.style.width = `${rect.width}px`;
  bkgChild.style.height = `${rect.height}px`;
  return bkgChild;
}

export function getPrevBlock(block: HTMLElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  assert(index !== -1, 'invalid block');
  assert(index > 0, 'no prev block');
  return children[index - 1];
}
