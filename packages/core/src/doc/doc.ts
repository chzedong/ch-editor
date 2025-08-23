import { DocBlockTextActions } from '../index.type';
import { DocObject, assert, DocBlock } from '../main';
import { RichText } from '../text/delta';
import { createEmptyDoc } from './doc-utils';

export class Doc {
  doc: DocObject;
  constructor(doc?: DocObject) {
    if (doc) {
      this.doc = doc;
    } else {
      this.doc = createEmptyDoc();
    }
  }

  getBlockIndexById(container: string, id: string) {
    const blocks = this.getContainerBlocks(container);
    return blocks.findIndex((v) => v.id === id);
  }

  getContainerBlocks(containerId: string) {
    return this.doc.blocks;
  }

  getBlockData(containerId: string, blockIndex: number) {
    const blocks = this.getContainerBlocks(containerId);
    const blockData = blocks[blockIndex];
    assert(blockData, 'no block data');
    return blockData;
  }

  updateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, 'no text');
    const newText = RichText.apply(blockData.text, actions);
    blockData.text = newText;
    return { newText, blockData };
  }

  insertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    const blocks = this.getContainerBlocks(containerId);
    blocks.splice(blockIndex, 0, blockData);
    return blockData;
  }

  deleteBlock(containerId: string, blockIndex: number) {
    const blocks = this.getContainerBlocks(containerId);
    assert(blocks[blockIndex], 'no block');
    const deletedBlock = blocks[blockIndex];
    blocks.splice(blockIndex, 1);
    return deletedBlock;
  }
}
