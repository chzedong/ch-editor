import { Editor } from "../editor/editor";
import { getBlockContent, getBlockId } from "../block/block-dom";
import { updateBlockContent } from "./update-block-content";
import { getTextBlockContentChildTextLength } from "./text-utils";
import { updateSelection } from "./update-selection";
import { EditorBlockPosition } from "../selection/block-position";
import { patchNode } from "../utils/patch-node";
import { assert } from "../utils/assert";
import { createElement } from "../utils/dom";

import { Block, BlockPath, DocBlock, DocBlockText } from "../index.type";
import { getTextBlockContentChildren, getPositionFromPoint } from "../line";

function createBlockContent(editor: Editor, path: BlockPath, container: Element, blockElement: Element, blockData: DocBlock) {
  const content = createElement("div", [], null);
  content.setAttribute("data-type", "block-content");
  if (blockElement) {
    blockElement.appendChild(content);
  }
  assert(blockData.text, "no text");
  updateBlockContent(editor, path, blockData.id, content, blockData.text);
  return content;
}

function updateBlockText(editor: Editor, block: HTMLElement, text: DocBlockText) {
  const newBlockContent = createElement("div", [], null);
  newBlockContent.setAttribute("data-type", "block-content");
  updateBlockContent(editor, [], getBlockId(block), newBlockContent, text);
  const oldContent = getBlockContent(block);
  patchNode(oldContent, newBlockContent);
}

function getBlockTextLength(block: HTMLElement) {
  const children = getTextBlockContentChildren(block);
  let count = 0;
  children.forEach((child) => {
    count += getTextBlockContentChildTextLength(child);
  });

  return count;
}

function getRangeFormPoint(block: HTMLElement, x: number, y: number) {
  const position = getPositionFromPoint(block, x, y);
  return new EditorBlockPosition(position.blockId, position.offset);
}

const TextBlock: Block = {
  blockKing: "text",
  blockType: "text",
  createBlockContent,
  setBlockText: updateBlockText,
  getBlockTextLength,
  getRangeFormPoint,
  updateSelection,
};

export default TextBlock;
