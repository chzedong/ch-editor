import { Editor } from './editor';
import { transformSelection } from '../selection/selection-utils';
import { Doc } from '../doc/doc';
import { assert } from '../utils/assert';

import { BoxData, DocBlock, DocBlockTextActions } from '../index.type';
import { isTextKindBlock } from './editor-blocks';
import { getBlockId, getBlockType, getLastBlock } from '../block/block-dom';
import { getChildBlocks, getContainerBlocksElement, getContainerById } from '../container/container-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { EditorSelectionRange } from '../selection/selection-range';

export class EditorDoc {
  private doc: Doc;

  constructor(private editor: Editor, doc?: Doc) {
    this.doc = doc || new Doc();
  }

  getDoc(): Doc {
    return this.doc;
  }

  setDoc(doc: Doc): void {
    this.doc = doc;
  }

  getBlockIndexById(container: string, id: string) {
    return this.doc.getBlockIndexById(container, id);
  }

  getContainerBlocks(containerId: string) {
    return this.doc.getContainerBlocks(containerId);
  }

  getBlockData(containerId: string, blockIndex: number) {
    return this.doc.getBlockData(containerId, blockIndex);
  }

  localUpdateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    const result = this.doc.updateBlockText(containerId, blockIndex, actions);
    const { newText, blockData } = result;

    // 渲染处理
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');

    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText(this.editor, block, newText);

    // 选择处理
    const newRange = transformSelection(this.editor, blockData.id, actions);
    this.editor.selection.setSelection(newRange.anchor, newRange.focus);

    // 事件触发
    this.editor.emit('docChange', {
      type: 'update',
      containerId,
      blockIndex,
      blockData
    });

    return newText;
  }

  localInsertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    const insertedBlock = this.doc.insertBlock(containerId, blockIndex, blockData);

    const container = getContainerById(this.editor, containerId);
    const blockElement = this.editor.editorBlocks.createBlock([{ containerId, blockIndex: blockIndex }], container, blockData);

    const blocksElements = getChildBlocks(container);
    const contentElement = getContainerBlocksElement(container);

    if (blockIndex === blocksElements.length || (blockIndex === 0 && blocksElements.length === 0)) {
      contentElement.appendChild(blockElement);
    } else {
      contentElement.insertBefore(blockElement, blocksElements[blockIndex]);
    }

    const pos = new EditorBlockPosition(blockData.id, 0);
    this.editor.selection.setSelection(pos, pos);

    // 事件触发
    this.editor.emit('docChange', {
      type: 'insert',
      containerId,
      blockIndex,
      blockData: insertedBlock
    });

    return insertedBlock;
  }

  localDeleteBlock(containerId: string, blockIndex: number, newRange?: EditorSelectionRange) {
    const blockElement = this.editor.findBlockByIndex(containerId, blockIndex);
    assert(blockElement, 'no block element');

    const deletedBlock = this.doc.deleteBlock(containerId, blockIndex);

    const container = getContainerById(this.editor, containerId);

    const blockClass = this.editor.editorBlocks.getBlockClass(deletedBlock.type);
    if (blockClass.deleteBlock) {
      return blockClass.deleteBlock(this.editor, blockElement);
    }
    blockElement.remove();

    if (newRange) {
      this.editor.selection.setSelection(newRange.anchor, newRange.focus);
      return;
    }

    const curIndexBlock = this.editor.findBlockByIndex(containerId, blockIndex);
    if (curIndexBlock) {
      const curIndexBlockId = getBlockId(curIndexBlock);
      const pos = new EditorBlockPosition(curIndexBlockId, 0);
      this.editor.selection.setSelection(pos, pos);
    } else {
      const lastBlock = getLastBlock(container);
      const lastBlockId = getBlockId(lastBlock);
      const pos = new EditorBlockPosition(lastBlockId, 0);
      this.editor.selection.setSelection(pos, pos);
    }

    // 事件触发
    this.editor.emit('docChange', {
      type: 'delete',
      containerId,
      blockIndex
    });

    return deletedBlock;
  }

  // Box 相关方法
  localInsertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData) {
    const result = this.doc.insertBox(containerId, blockIndex, offset, boxData);
    const { newText, blockData } = result;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');

    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText(this.editor, block, newText);

    // 触发文档变化事件
    this.editor.emit('docChange', {
      type: 'insertBox',
      containerId,
      blockIndex,
      offset,
      boxData
    });

    return result;
  }

  localDeleteBox(containerId: string, blockIndex: number, offset: number) {
    const result = this.doc.deleteBox(containerId, blockIndex, offset);
    const { newText, blockData } = result;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');

    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText(this.editor, block, newText);

    // 触发文档变化事件
    this.editor.emit('docChange', {
      type: 'deleteBox',
      containerId,
      blockIndex,
      offset
    });

    return result;
  }
}
