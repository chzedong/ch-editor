import { TypedEmitter } from 'tiny-typed-emitter';
import { RichText } from '../utils/delta';
import { createEmptyDoc } from './doc-utils';
import { assert } from '../utils/assert';
import { createBoxInsertOp, isBoxOp } from '../box/box-op';
import { isTextOp } from '../text/text-op';

import { DocBlock, DocBlockTextActions, DocBlockText, DocObject, BoxData } from '../index.type';
import { EditorSelectionRange } from '../main';

export interface DocEventMap {
  afterUpdateBlockText: (event: { containerId: string; blockIndex: number; blockData: DocBlock; newText: DocBlockText; actions: DocBlockTextActions; source: 'local' | 'remote' }) => void;
  afterInsertBlock: (event: { containerId: string; blockIndex: number; blockData: DocBlock; source: 'local' | 'remote' }) => void;
  afterDeleteBlock: (event: { containerId: string; blockIndex: number; deletedBlock: DocBlock; source: 'local' | 'remote'; newRange?: EditorSelectionRange }) => void;
  afterUpdateBlock: (event: { containerId: string; blockIndex: number; blockData: DocBlock; source: 'local' | 'remote' }) => void;
  afterInsertBox: (event: { containerId: string; blockIndex: number; offset: number; boxData: BoxData; newText: DocBlockText; insertAction: DocBlockTextActions; source: 'local' | 'remote' }) => void;
  afterDeleteBox: (event: { containerId: string; blockIndex: number; offset: number; deletedBoxData: BoxData; newText: DocBlockText; deleteAction: DocBlockTextActions; source: 'local' | 'remote' }) => void;
}

export interface DocType extends TypedEmitter<DocEventMap>{
  doc: DocObject;

  getBlockIndexById(containerId: string, id: string): number;
  getBlockByIndex(containerId: string, index: number): DocBlock;
  getBlockById(id: string): DocBlock;
  getContainerId(blockId: string): string;
  getContainerBlocks(containerId: string): DocBlock[];
  getBlockData(containerId: string, blockIndex: number): DocBlock;

  forEachContainer(callback: (containerId: string) => boolean | void): boolean;
  forEachBlock(callback: (containerId: string, blockIndex: number, blockData: DocBlock) => boolean | void): boolean;

  updateBlock(containerId: string, blockIndex: number, newData: DocBlock): DocBlock;
  insertBlock(containerId: string, blockIndex: number, blockData: DocBlock): DocBlock;
  deleteBlock(containerId: string, blockIndex: number): DocBlock;

  updateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions): { newText: DocBlockText; blockData: DocBlock };

  insertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData): { newText: DocBlockText; insertAction: DocBlockTextActions };
  deleteBox(containerId: string, blockIndex: number, offset: number): { newText: DocBlockText; deleteAction: DocBlockTextActions; deletedBoxData: BoxData };
}


export class Doc extends TypedEmitter<DocEventMap> implements DocType {
  doc: DocObject;
  constructor(doc?: DocObject) {
    super();
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

  forEachContainer(callback: (containerId: string) => boolean | void): boolean {
    const result = callback('root');
    // 如果callback返回false，则停止遍历
    return result !== false;
  }

  forEachBlock(callback: (containerId: string, blockIndex: number, blockData: DocBlock) => boolean | void): boolean {
    let shouldContinue = true;

    this.forEachContainer((containerId) => {
      if (!shouldContinue) {
        return false; // 熔断：停止容器遍历
      }

      const blocks = this.getContainerBlocks(containerId);

      // 使用传统for循环以支持提前退出
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const blockData = blocks[blockIndex];
        const result = callback(containerId, blockIndex, blockData);

        // 如果callback返回false，则停止遍历
        if (result === false) {
          shouldContinue = false;
          break;
        }
      }

      return shouldContinue;
    });

    return shouldContinue;
  }

  updateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, 'no text');
    const newText = RichText.apply(blockData.text, actions);
    blockData.text = newText;

    this.emit('afterUpdateBlockText', {
      containerId,
      blockIndex,
      blockData,
      newText,
      actions,
      source: 'local'
    });
    return { newText, blockData };
  }

  insertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    const blocks = this.getContainerBlocks(containerId);
    blocks.splice(blockIndex, 0, blockData);

    this.emit('afterInsertBlock', {
      containerId,
      blockIndex,
      blockData,
      source: 'local'
    });

    return blockData;
  }

  deleteBlock(containerId: string, blockIndex: number) {
    const blocks = this.getContainerBlocks(containerId);
    assert(blocks[blockIndex], 'no block');
    const deletedBlock = blocks[blockIndex];
    blocks.splice(blockIndex, 1);

    this.emit('afterDeleteBlock', {
      containerId,
      blockIndex,
      deletedBlock,
      source: 'local'
    });

    return deletedBlock;
  }

  updateBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    const blocks = this.getContainerBlocks(containerId);
    assert(blocks[blockIndex], 'no block');
    blocks[blockIndex] = blockData;

    this.emit('afterUpdateBlock', {
      containerId,
      blockIndex,
      blockData,
      source: 'local'
    });
    return blockData;
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
    const insertAction: DocBlockTextActions = [
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

    // 触发后置动作hook，让协同服务或其他扩展处理渲染和选区更新
    this.emit('afterInsertBox', {
      containerId,
      blockIndex,
      offset,
      boxData,
      newText,
      insertAction,
      source: 'local'
    });

    return { newText, insertAction };
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
    let deleteAction: DocBlockTextActions = [];
    if (offset === 0) {
      deleteAction = [
        {
          delete: 1 // box 的逻辑长度为 1
        }
      ];
    } else {
      deleteAction = [
        {
          retain: offset,
          delete: 1 // box 的逻辑长度为 1
        }
      ];
    }

    // 应用操作到文本
    const newText = RichText.apply(blockData.text, deleteAction);
    blockData.text = newText;


    // 触发后置动作hook，让协同服务或其他扩展处理渲染和选区更新
    this.emit('afterDeleteBox', {
      containerId,
      blockIndex,
      offset,
      deletedBoxData,
      newText,
      deleteAction,
      source: 'local'
    });

    return { newText, deleteAction, deletedBoxData };
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
