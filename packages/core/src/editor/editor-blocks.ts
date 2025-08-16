import { Editor } from './editor';
import { createBlockElement, getBlockType } from '../block/block-dom';
import { assert } from '../utils/assert';

import { Block, BlockPath, DocBlock } from '../index.type';

export default class EditorBlocks {
  private blocks = new Map<string, Block>();

  constructor(private editor: Editor) { }

  registerBlockClass(block: Block) {
    const type = block.blockType;
    const exists = this.blocks.get(type);
    assert(!exists, 'no block type');
    this.blocks.set(type, block);
  }

  getBlockClass(type: string) {
    const exists = this.blocks.get(type);
    assert(exists, 'unknown block type');
    return exists;
  }

  hasBlock(type: string) {
    return this.blocks.has(type);
  }

  createBlock(path: BlockPath, container: Element, block: DocBlock) {
    const blockElement = createBlockElement(this.editor, path, block);
    const blockClass = this.getBlockClass(block.type);

    const content = blockClass.createBlockContent(this.editor, path, container, blockElement, block);

    if (content.parentElement !== blockElement) {
      blockElement.appendChild(content);
    }

    return blockElement;
  }
}

export function isTextKindBlock(editor: Editor, block: HTMLElement) {
  return editor.editorBlocks.getBlockClass(getBlockType(block)).blockType === 'text';
}