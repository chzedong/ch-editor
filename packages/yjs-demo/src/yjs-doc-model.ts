import * as Y from 'yjs';
import { TypedEmitter } from 'tiny-typed-emitter';
import { DocObject, DocBlock, DocBlockText, DocBlockTextActions, DocType, BoxData, DocBlockTextOp } from '@ch-editor/core';
import { DocEventMap } from '@ch-editor/core/src/doc/doc';

/**
 * 基于 YJS 的 RemoteDoc 实现
 * 实现 DocType 接口，支持协同编辑
 */
export class RemoteDoc extends TypedEmitter<DocEventMap> implements DocType {
  public readonly ydoc: Y.Doc;
  private readonly yblocks: Y.Array<Y.Map<any>>;
  private _doc: DocObject;

  constructor(doc: Y.Doc) {
    super();
    this.ydoc = doc;
    this.yblocks = this.ydoc.getArray<Y.Map<any>>('blocks');

    // 初始化文档数据
    this._doc = { blocks: [] };

    // 监听 YJS 变化，同步到本地 doc
    this.yblocks.observe(() => {
      this._doc = this.toDocObject();
    });
  }

  get doc(): DocObject {
    return this._doc;
  }

  // ==================== DocType 接口实现 ====================

  getBlockIndexById(containerId: string, id: string): number {
    // 在这个简化实现中，我们假设只有一个容器（根容器）
    const blocks = this.getContainerBlocks(containerId);
    return blocks.findIndex(block => block.id === id);
  }

  getBlockByIndex(containerId: string, index: number): DocBlock {
    const blocks = this.getContainerBlocks(containerId);
    return blocks[index];
  }

  getBlockById(id: string): DocBlock {
    for (let i = 0; i < this.yblocks.length; i++) {
      const blockMap = this.yblocks.get(i);
      if (blockMap.get('id') === id) {
        return this.mapToDocBlock(blockMap);
      }
    }
    throw new Error(`Block with id ${id} not found`);
  }

  getContainerId(blockId: string): string {
    // 在这个简化实现中，所有块都在根容器中
    return 'root';
  }

  getContainerBlocks(containerId: string): DocBlock[] {
    // 在这个简化实现中，我们只支持根容器
    if (containerId !== 'root') {
      return [];
    }
    return this.toDocObject().blocks;
  }

  getBlockData(containerId: string, blockIndex: number): DocBlock {
    return this.getBlockByIndex(containerId, blockIndex);
  }

  forEachContainer(callback: (containerId: string) => boolean | void): boolean {
    // 在这个简化实现中，只有一个根容器
    const result = callback('root');
    return result === true;
  }

  forEachBlock(callback: (containerId: string, blockIndex: number, blockData: DocBlock) => boolean | void): boolean {
    const blocks = this.getContainerBlocks('root');
    for (let i = 0; i < blocks.length; i++) {
      const result = callback('root', i, blocks[i]);
      if (result === true) {
        return true;
      }
    }
    return false;
  }

  updateBlock(containerId: string, blockIndex: number, newData: DocBlock): DocBlock {
    if (containerId !== 'root' || blockIndex < 0 || blockIndex >= this.yblocks.length) {
      throw new Error('Invalid container or block index');
    }

    const blockMap = this.yblocks.get(blockIndex);

    // 更新所有属性
    Object.entries(newData).forEach(([key, value]) => {
      if (key === 'text') {
        blockMap.set(key, this.docBlockTextToYText(value as DocBlockText));
      } else {
        blockMap.set(key, value);
      }
    });

    // 触发 afterUpdateBlock 事件
    this.emit('afterUpdateBlock', {
      containerId,
      blockIndex,
      blockData: newData,
      source: 'remote'
    });

    return this.mapToDocBlock(blockMap);
  }

  insertBlock(containerId: string, blockIndex: number, blockData: DocBlock): DocBlock {
    if (containerId !== 'root') {
      throw new Error('Invalid container');
    }

    const blockMap = this.docBlockToMap(blockData);

    if (blockIndex >= 0 && blockIndex <= this.yblocks.length) {
      this.yblocks.insert(blockIndex, [blockMap]);
    } else {
      this.yblocks.push([blockMap]);
    }

    // 触发 afterInsertBlock 事件
    this.emit('afterInsertBlock', {
      containerId,
      blockIndex,
      blockData,
      source: 'remote'
    });

    return blockData;
  }

  deleteBlock(containerId: string, blockIndex: number): DocBlock {
    if (containerId !== 'root' || blockIndex < 0 || blockIndex >= this.yblocks.length) {
      throw new Error('Invalid container or block index');
    }

    const blockMap = this.yblocks.get(blockIndex);
    const deletedBlock = this.mapToDocBlock(blockMap);

    this.yblocks.delete(blockIndex, 1);

    // 触发 afterDeleteBlock 事件
    this.emit('afterDeleteBlock', {
      containerId,
      blockIndex,
      deletedBlock,
      source: 'remote'
    });

    return deletedBlock;
  }

  updateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions): { newText: DocBlockText; blockData: DocBlock } {
    if (containerId !== 'root' || blockIndex < 0 || blockIndex >= this.yblocks.length) {
      throw new Error('Invalid container or block index');
    }

    const blockMap = this.yblocks.get(blockIndex);
    const yText = blockMap.get('text') as Y.Text;

    if (!yText) {
      throw new Error('Block does not have text content');
    }

    // 应用文本操作
    this.applyTextActionsToYText(yText, actions);

    const newText = this.yTextToDocBlockText(yText);
    const blockData = this.mapToDocBlock(blockMap);

    // 触发 afterUpdateBlockText 事件
    this.emit('afterUpdateBlockText', {
      containerId,
      blockIndex,
      blockData,
      newText,
      actions,
      source: 'remote'
    });

    return { newText, blockData };
  }

  insertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData): { newText: DocBlockText; insertAction: DocBlockTextActions } {
    if (containerId !== 'root' || blockIndex < 0 || blockIndex >= this.yblocks.length) {
      throw new Error('Invalid container or block index');
    }

    const blockMap = this.yblocks.get(blockIndex);
    const yText = blockMap.get('text') as Y.Text;

    if (!yText) {
      throw new Error('Block does not have text content');
    }

    // 创建 box 插入操作
    const insertAction: DocBlockTextActions = [
      { retain: offset },
      { insert: '\uFFFC', attributes: { insertBox: boxData } }
    ];

    this.applyTextActionsToYText(yText, insertAction);

    const newText = this.yTextToDocBlockText(yText);

    // 触发 afterInsertBox 事件
    this.emit('afterInsertBox', {
      containerId,
      blockIndex,
      offset,
      boxData,
      newText,
      insertAction,
      source: 'remote'
    });

    return { newText, insertAction };
  }

  deleteBox(containerId: string, blockIndex: number, offset: number): { newText: DocBlockText; deleteAction: DocBlockTextActions; deletedBoxData: BoxData } {
    if (containerId !== 'root' || blockIndex < 0 || blockIndex >= this.yblocks.length) {
      throw new Error('Invalid container or block index');
    }

    const blockMap = this.yblocks.get(blockIndex);
    const yText = blockMap.get('text') as Y.Text;

    if (!yText) {
      throw new Error('Block does not have text content');
    }

    // 获取要删除的 box 数据
    const currentText = this.yTextToDocBlockText(yText);
    let currentOffset = 0;
    let deletedBoxData: BoxData | null = null;

    for (const op of currentText) {
      if (currentOffset === offset && op.attributes?.insertBox) {
        deletedBoxData = op.attributes.insertBox as BoxData;
        break;
      }
      currentOffset += op.insert.length;
    }

    if (!deletedBoxData) {
      throw new Error('No box found at the specified offset');
    }

    // 创建删除操作
    const deleteAction: DocBlockTextActions = [
      { retain: offset },
      { delete: 1 }
    ];

    this.applyTextActionsToYText(yText, deleteAction);

    const newText = this.yTextToDocBlockText(yText);

    // 触发 afterDeleteBox 事件
    this.emit('afterDeleteBox', {
      containerId,
      blockIndex,
      offset,
      deletedBoxData,
      newText,
      deleteAction,
      source: 'remote'
    });

    return { newText, deleteAction, deletedBoxData };
  }

  // ==================== 辅助方法 ====================

  /**
   * 将普通的 DocObject 转换为 YJS 结构
   */
  fromDocObject(docObject: DocObject): void {
    // 清空现有数据
    this.yblocks.delete(0, this.yblocks.length);

    // 添加所有 blocks
    docObject.blocks.forEach((block) => {
      const blockMap = this.docBlockToMap(block);
      this.yblocks.push([blockMap]);
    });
  }

  /**
   * 将 YJS 结构转换为普通的 DocObject
   */
  toDocObject(): DocObject {
    const blocks: DocBlock[] = [];

    this.yblocks.forEach((blockMap) => {
      const block = this.mapToDocBlock(blockMap);
      if (block) {
        blocks.push(block);
      }
    });

    return { blocks };
  }

  /**
   * 将 DocBlock 转换为 Y.Map
   */
  private docBlockToMap(block: DocBlock): Y.Map<any> {
    const map = new Y.Map<any>();

    Object.entries(block).forEach(([key, value]) => {
      if (key === 'text') {
        map.set(key, this.docBlockTextToYText(value as DocBlockText));
      } else {
        map.set(key, value);
      }
    });

    return map;
  }

  /**
   * 将 Y.Map 转换为 DocBlock
   */
  private mapToDocBlock(map: Y.Map<any>): DocBlock {
    const block: any = {};

    map.forEach((value, key) => {
      if (key === 'text' && value instanceof Y.Text) {
        block[key] = this.yTextToDocBlockText(value);
      } else {
        block[key] = value;
      }
    });

    return block as DocBlock;
  }

  /**
   * 将 DocBlockText 转换为 Y.Text
   */
  private docBlockTextToYText(text: DocBlockText): Y.Text {
    const yText = new Y.Text();

    let offset = 0;
    text.forEach((op) => {
      yText.insert(offset, op.insert, op.attributes);
      offset += op.insert.length;
    });

    return yText;
  }

  /**
   * 将 Y.Text 转换为 DocBlockText
   */
  private yTextToDocBlockText(yText: Y.Text): DocBlockText {
    const ops: DocBlockTextOp[] = [];

    yText.toDelta().ops.forEach((op: any) => {
      ops.push({
        insert: op.insert || '',
        attributes: op.attributes
      });
    });

    return ops;
  }

  /**
   * 对 Y.Text 应用文本操作
   */
  private applyTextActionsToYText(yText: Y.Text, actions: DocBlockTextActions): void {
    let offset = 0;

    actions.forEach((action) => {
      if (action.retain !== undefined) {
        offset += action.retain;
      }

      if (action.insert !== undefined) {
        yText.insert(offset, action.insert, action.attributes);
        offset += action.insert.length;
      }

      if (action.delete !== undefined) {
        yText.delete(offset, action.delete);
      }

      if (action.attributes && action.retain !== undefined) {
        yText.format(offset - action.retain, action.retain, action.attributes);
      }
    });
  }
}
