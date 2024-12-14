import { Editor } from "../editor/editor";
import { getBlockContent, getBlockId } from "../block/block-dom";
import { updateBlockContent } from "./update-block-content";
import { getTextBlockContentChildTextLength } from "./text-utils";
import { updateSelection } from "./update-selection";
import { getNodeOffsetFromPoint, getTextBlockContentChildren } from "../selection/offset-rect";
import { EditorBlockPosition } from "../selection/block-position";
import { patchNode } from "../utils/patch-node";
import { assert } from "../utils/assert";
import { createElement } from "../utils/dom";

import { Block, BlockPath, DocBlock, DocBlockText } from "../index.type";

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
  const children = getTextBlockContentChildren(block);
  let offset = 0;
  let targetChild = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const rect = child.getBoundingClientRect();
    if (rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y) {
      targetChild = child;
      break;
    }
    offset += getTextBlockContentChildTextLength(child);
  }
  assert(targetChild, "no target child");

  const spanOffset = getNodeOffsetFromPoint(targetChild.firstChild as Text, x, y);

  const blockId = getBlockId(block);
  return new EditorBlockPosition(blockId, offset + spanOffset);
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
