import { RichText } from '../text/delta';
import { createEmptyDoc } from './doc-utils';
import { assert } from '../utils/assert';
import { createBoxInsertOp, isBoxOp, isTextOp } from '../box/box-data-model';
import { BoxData } from '../index.type';

import { DocBlock, DocBlockTextActions, DocObject } from '../index.type';

export class Doc {
  doc: DocObject;
  constructor(doc?: DocObject) {
    if (doc) {
      this.doc = doc;
    } else {
      this.doc = createEmptyDoc();
    }
  }

  getBlockIndexById(containerId: string, id: string) {
    const blocks = this.getContainerBlocks(containerId);
    return blocks.findIndex((v) => v.id === id);
  }

  getBlockByIndex(containerId: string, index: number) {
    const blocks = this.getContainerBlocks(containerId);
    return blocks[index];
  }

  getBlockById(id: string) {
    const blocks = this.getContainerBlocks('root');
    const block = blocks.find((v) => v.id === id);
    assert(block, 'no block');
    return block;
  }

  getContainerId(blockId: string) {
    return 'root';
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

  // ==================== Box 数据操作 ====================

  /**
   * 在指定位置插入 box
   * @param containerId 容器 ID
   * @param blockIndex 块索引
   * @param offset 文本偏移量
   * @param boxData box 数据
   */
  insertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData) {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, 'no text');

    // 创建 box 插入操作
    const boxInsertOp = createBoxInsertOp(boxData);
    const insertAction = [
      {
        retain: offset
      },
      {
        ...boxInsertOp
      }
    ];

    // 应用操作到文本
    const newText = RichText.apply(blockData.text, insertAction);
    blockData.text = newText;

    return { newText, blockData, boxData };
  }

  /**
   * 删除指定位置的 box
   * @param containerId 容器 ID
   * @param blockIndex 块索引
   * @param offset box 的偏移量
   */
  deleteBox(containerId: string, blockIndex: number, offset: number) {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, 'no text');

    // 查找要删除的 box
    const deletedBoxData = this.getBoxAtOffset(containerId, blockIndex, offset);
    assert(deletedBoxData, 'no box');

    // 创建删除操作
    let deleteAction;
    if (offset === 0) {
      deleteAction = {
        delete: 1 // box 的逻辑长度为 1
      };
    } else {
      deleteAction = {
        retain: offset,
        delete: 1 // box 的逻辑长度为 1
      };
    }

    // 应用操作到文本
    const newText = RichText.apply(blockData.text, [deleteAction]);
    blockData.text = newText;

    return { newText, blockData, deletedBoxData };
  }

  /**
   * 获取指定偏移量位置的 box 数据
   * @param containerId 容器 ID
   * @param blockIndex 块索引
   * @param offset box 的偏移量
   */
  getBoxAtOffset(containerId: string, blockIndex: number, offset: number): BoxData | null {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, 'no text');

    let currentOffset = 0;
    for (const op of blockData.text) {
      if (isBoxOp(op) && currentOffset === offset) {
        return op.attributes.insertBox;
      }

      if (isTextOp(op)) {
        currentOffset += op.insert.length;
      } else if (isBoxOp(op)) {
        currentOffset += 1;
      }

      if (currentOffset > offset) {
        break;
      }
    }

    return null;
  }
}
