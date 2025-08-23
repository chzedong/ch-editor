import { Editor } from '../editor/editor';
import { getChildBlocks, getParentContainer } from '../container/container-dom';
import { createElement } from '../utils/dom';
import { assert } from '../utils/assert';
import './block.scss';

import { BlockContentElement, BlockElement, BlockPath, ContainerElement, DocBlock } from '../index.type';

export function createBlockElement(editor: Editor, path: BlockPath, data: DocBlock): BlockElement {
  const elem = createElement('div', [`${data.type}-block`], null);
  elem.id = data.id;
  elem.setAttribute('data-type', 'editor-block');
  elem.setAttribute('data-block-type', data.type);

  return elem;
}

export function getBlockId(block: BlockElement) {
  assert(block.id, 'id is required');
  return block.id;
}

export function getBlockType(block: BlockElement) {
  const type = block.getAttribute('data-block-type');
  assert(type, 'type is required');
  return type;
}

export function getBlockContent(block: BlockElement): BlockContentElement {
  const content = block.querySelector(':scope >div[data-type=block-content]');
  assert(content instanceof HTMLDivElement, 'no block content');
  return content;
}

export function getBlockIndex(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  assert(index !== -1, 'invalid block');
  return index;
}

export function getParentBlock(node: HTMLElement) {
  const block = node.closest('[data-type=editor-block]');
  return block as BlockElement | null;
}

export function isLastBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);

  assert(index !== -1, 'invalid block');

  return index === children.length - 1;
}

export function isFirstBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);

  assert(index !== -1, 'invalid block');

  return index === 0;
}

export function isBlock(node: HTMLElement) {
  return node.getAttribute('data-type') === 'editor-block';
}

export function getLastBlock(container: ContainerElement): BlockElement {
  const children = getChildBlocks(container);

  return children[children.length - 1] as BlockElement;
}

export function getFirstBlock(container: ContainerElement): BlockElement {
  const children = getChildBlocks(container);

  return children[0] as BlockElement;
}

export function getPrevBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  assert(index !== -1, 'invalid block');
  assert(index > 0, 'no prev block');
  return children[index - 1] as BlockElement;
}

export function getNextBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  assert(index !== -1, 'invalid block');
  assert(index < children.length - 1, 'no next block');
  return children[index + 1] as BlockElement;
}

export function findPrevBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  if (index === 0) {
    return null;
  }
  return children[index - 1] as BlockElement;
}

export function findNextBlock(block: BlockElement) {
  const container = getParentContainer(block);
  const children = getChildBlocks(container);
  const index = children.indexOf(block);
  if (index === children.length - 1) {
    return null;
  }
  return children[index + 1] as BlockElement;
}
