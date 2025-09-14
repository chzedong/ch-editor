import { Editor } from '../editor/editor';
import { transformSelection } from '../selection/selection-utils';
import { Doc } from './doc';
import { assert } from '../utils/assert';
import { LifecycleHooks } from './hooks';

import { isTextKindBlock } from '../text/text-block';
import { getBlockId, getBlockType, getLastBlock } from '../block/block-dom';
import { getChildBlocks, getContainerBlocksElement, getContainerById } from '../container/container-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { EditorSelectionRange } from '../selection/selection-range';

import { BoxData, DocBlock, DocBlockTextActions } from '../index.type';

export class EditorDoc {
  private doc: Doc;
  public readonly hooks: LifecycleHooks; // 公开钩子系统供外部扩展使用

  constructor(private editor: Editor, doc?: Doc) {
    this.doc = doc || new Doc();
    this.hooks = new LifecycleHooks();
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

  getBlockByIndex(container: string, index: number) {
    return this.doc.getBlockByIndex(container, index);
  }

  getContainerId(blockId: string) {
    return this.doc.getContainerId(blockId);
  }

  getBlockById(id: string) {
    return this.doc.getBlockById(id);
  }

  getContainerBlocks(containerId: string) {
    return this.doc.getContainerBlocks(containerId);
  }

  getBlockData(containerId: string, blockIndex: number) {
    return this.doc.getBlockData(containerId, blockIndex);
  }

  forEachContainer(callback: (containerId: string) => void) {
    this.doc.forEachContainer(callback);
  }

  forEachBlock(callback: (containerId: string, blockIndex: number, blockData: DocBlock) => void) {
    this.doc.forEachBlock(callback);
  }

  localUpdateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    // 触发before钩子
    this.hooks.trigger('beforeUpdateBlock', {
      containerId,
      blockIndex,
      actions
    });

    // 数据层处理
    const { newText, blockData } = this.doc.updateBlockText(containerId, blockIndex, actions);
    const newRange = transformSelection(this.editor, blockData.id, actions);

    // 渲染处理
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');
    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);

    // 选区更新
    this.editor.selection.setSelection(newRange.anchor, newRange.focus, { syncRender: false });

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'update',
      containerId,
      blockIndex,
      blockData
    });

    return newText;
  }

  localInsertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    // 触发before钩子
    this.hooks.trigger('beforeInsertBlock', {
      containerId,
      blockIndex,
      blockData
    });

    // 数据层处理
    const insertedBlock = this.doc.insertBlock(containerId, blockIndex, blockData);

    // 渲染处理
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
    this.editor.selection.setSelection(pos, pos, { syncRender: false });

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'insert',
      containerId,
      blockIndex,
      blockData: insertedBlock
    });

    return insertedBlock;
  }

  localDeleteBlock(containerId: string, blockIndex: number, newRange?: EditorSelectionRange) {
    // 触发before钩子
    this.hooks.trigger('beforeDeleteBlock', {
      containerId,
      blockIndex
    });

    const blockElement = this.editor.findBlockByIndex(containerId, blockIndex);
    assert(blockElement, 'no block element');
    const deletedBlock = this.doc.deleteBlock(containerId, blockIndex);
    const container = getContainerById(this.editor, containerId);

    const blockClass = this.editor.editorBlocks.getBlockClass(deletedBlock.type);
    if (!blockClass.deleteBlock?.(this.editor, blockElement)) {
      blockElement.remove();

      if (newRange) {
        this.editor.selection.setSelection(newRange.anchor, newRange.focus, { syncRender: false });
        return;
      }

      const curIndexBlock = this.editor.findBlockByIndex(containerId, blockIndex);
      if (curIndexBlock) {
        const curIndexBlockId = getBlockId(curIndexBlock);
        const pos = new EditorBlockPosition(curIndexBlockId, 0);
        this.editor.selection.setSelection(pos, pos, { syncRender: false });
      } else {
        const lastBlock = getLastBlock(container);
        const lastBlockId = getBlockId(lastBlock);
        const pos = new EditorBlockPosition(lastBlockId, 0);
        this.editor.selection.setSelection(pos, pos, { syncRender: false });
      }
    }

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'delete',
      containerId,
      blockIndex
    });

    return deletedBlock;
  }

  // Box 相关方法
  localInsertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData) {
    // 触发before钩子
    this.hooks.trigger('beforeInsertBox', {
      containerId,
      blockIndex,
      offset,
      boxData
    });

    const result = this.doc.insertBox(containerId, blockIndex, offset, boxData);
    const { newText, insertAction } = result;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const blockData = this.doc.getBlockData(containerId, blockIndex);
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');
    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);

    // 选区设置
    const newRange = transformSelection(this.editor, blockData.id, insertAction);
    this.editor.selection.setSelection(newRange.anchor, newRange.focus);

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'insertBox',
      containerId,
      blockIndex,
      offset,
      boxData
    });

    return result;
  }

  localDeleteBox(containerId: string, blockIndex: number, offset: number) {
    // 触发before钩子
    this.hooks.trigger('beforeDeleteBox', {
      containerId,
      blockIndex,
      offset
    });

    const result = this.doc.deleteBox(containerId, blockIndex, offset);
    const { newText, deleteAction } = result;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const blockData = this.doc.getBlockData(containerId, blockIndex);
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');

    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);

    // 选区设置
    const newRange = transformSelection(this.editor, blockData.id, deleteAction);
    this.editor.selection.setSelection(newRange.anchor, newRange.focus);

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'deleteBox',
      containerId,
      blockIndex,
      offset
    });

    return result;
  }

  localUpdateBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    // 触发before钩子
    this.hooks.trigger('beforeUpdateBlock', {
      containerId,
      blockIndex
    });

    // 数据层处理
    const updatedBlock = this.doc.updateBlock(containerId, blockIndex, blockData);

    // 渲染处理
    const block = this.editor.getBlockById(blockData.id);
    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);

    if (blockClass.updateBlock) {
      blockClass.updateBlock(this.editor, block, updatedBlock);
    }

    // 触发文档变化事件
    this.hooks.trigger('docChange', {
      type: 'update',
      containerId,
      blockIndex,
      blockData: updatedBlock
    });

    return updatedBlock;
  }
}
