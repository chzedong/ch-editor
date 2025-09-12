import { Editor } from '../editor/editor';
import { getBlockContent, getBlockId, getBlockType } from '../block/block-dom';
import { updateBlockContent } from './text-block-render';
import { updateSelection } from './text-selection-render';
import { EditorBlockPosition } from '../selection/block-position';
import { patchNode } from '../utils/patch-node';
import { assert } from '../utils/assert';
import { createElement } from '../utils/dom';

import { Block, BlockElement, BlockPath, DocBlock, DocBlockText } from '../index.type';
import { assertLineBreaker, getPositionFromPoint, LineBreaker } from './line/text-line';
import { getDocTextLength } from './text-op';

function createBlockContent(editor: Editor, path: BlockPath, container: Element, blockElement: Element, blockData: DocBlock) {
  const content = createElement('div', [], null);
  content.setAttribute('data-type', 'block-content');
  if (blockElement) {
    blockElement.appendChild(content);
  }
  assert(blockData.text, 'no text');
  updateBlockContent(editor, path, blockData.id, content, blockData.text);
  return content;
}

function updateBlockText(editor: Editor, block: BlockElement, text: DocBlockText) {
  const newBlockContent = createElement('div', [], null);
  newBlockContent.setAttribute('data-type', 'block-content');
  updateBlockContent(editor, [], getBlockId(block), newBlockContent, text);
  const oldContent = getBlockContent(block);
  patchNode(oldContent, newBlockContent);
}

function getBlockTextLength(block: DocBlock) {
  assert(block.text, 'no text');
  const count = getDocTextLength(block.text);

  return count;
}

function getRangeFormPoint(editor: Editor, block: BlockElement, x: number, y: number, lineBreaker?: LineBreaker) {
  const position = getPositionFromPoint(block, x, y, lineBreaker);
  return new EditorBlockPosition(position.blockId, position.offset, position.type);
}

function getCursorRect(editor: Editor, block: BlockElement, position: EditorBlockPosition, lineBreaker?: LineBreaker) {
  lineBreaker = assertLineBreaker(block, lineBreaker);
  const cursorRect = lineBreaker.getCaretRect(position);
  return cursorRect;
}

const TextBlock: Block = {
  blockKing: 'text',
  blockType: 'text',
  createBlockContent,
  setBlockText: updateBlockText,
  getBlockTextLength,
  getRangeFormPoint,
  updateSelection,
  getCursorRect
};

export default TextBlock;export function isTextKindBlock(editor: Editor, block: BlockElement) {
  return editor.editorBlocks.getBlockClass(getBlockType(block)).blockType === 'text';
}

