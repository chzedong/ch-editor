import { Editor } from '../editor/editor';
import {
  LifecycleHooks,
  AfterUpdateBlockTextContext,
  AfterInsertBlockContext,
  AfterDeleteBlockContext,
  AfterInsertBoxContext,
  AfterDeleteBoxContext,
  AfterUpdateBlockContext
} from './hooks';
import { assert } from '../utils/assert';
import { getBlockType, getBlockId, getLastBlock } from '../block/block-dom';
import { getContainerById, getChildBlocks, getContainerBlocksElement } from '../container/container-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { transformSelection } from '../selection/selection-utils';
import { isTextKindBlock } from '../text';

/**
 * 默认的hook处理器，用于处理文档的渲染和选区更新
 */
export class DefaultHookHandlers {
  constructor(private editor: Editor, private hooks: LifecycleHooks) {
    this.registerDefaultHooks();
  }

  /**
   * 注册默认的hook处理器
   */
  private registerDefaultHooks(): void {
    this.hooks.register('afterUpdateBlockText', this.handleAfterUpdateBlockText.bind(this));

    this.hooks.register('afterInsertBlock', this.handleAfterInsertBlock.bind(this));
    this.hooks.register('afterDeleteBlock', this.handleAfterDeleteBlock.bind(this));
    this.hooks.register('afterUpdateBlock', this.handleAfterUpdateBlock.bind(this));

    this.hooks.register('afterInsertBox', this.handleAfterInsertBox.bind(this));
    this.hooks.register('afterDeleteBox', this.handleAfterDeleteBox.bind(this));
  }

  private _triggerDocChange(type: any, context: any): void {
    const { containerId, blockIndex, offset, boxData, source } = context;

    const docChangeContext: any = {
      type,
      containerId,
      blockIndex,
      offset,
      boxData,
      source
    };

    if (context.blockData) {
      docChangeContext.blockData = context.blockData;
    }

    this.hooks.trigger('docChange', docChangeContext);
  }

  /**
   * 处理afterUpdateBlockText事件
   */
  private handleAfterUpdateBlockText(context: AfterUpdateBlockTextContext): void {
    const { blockData, newText, actions, source } = context;

    // 渲染处理
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');
    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);

    // 选区更新
    if (source === 'local') {
      const newRange = transformSelection(this.editor, blockData.id, actions);
      this.editor.selection.setSelection(newRange.anchor, newRange.focus, { syncRender: false });
    }

    // 触发文档变化事件
    this._triggerDocChange('update', context);
  }

  /**
   * 处理afterInsertBlock事件
   */
  private handleAfterInsertBlock(context: AfterInsertBlockContext): void {
    const { containerId, blockIndex, blockData, source } = context;

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

    // 选区更新
    if (source === 'local') {
      // 设置选区到新块的开始位置
      const pos = new EditorBlockPosition(blockData.id, 0);
      this.editor.selection.setSelection(pos, pos, { syncRender: false });
    }

    // 触发文档变化事件
    this._triggerDocChange('insert', context);
  }

  /**
   * 处理afterDeleteBlock事件
   */
  private handleAfterDeleteBlock(context: AfterDeleteBlockContext): void {
    const { containerId, blockIndex, deletedBlock, newRange, source } = context;

    // 删除逻辑处理
    const blockElement = this.editor.findBlockByIndex(containerId, blockIndex);
    assert(blockElement, 'blockElement is null');
    const blockClass = this.editor.editorBlocks.getBlockClass(deletedBlock.type);
    if (!blockClass.deleteBlock?.(this.editor, blockElement)) {
      blockElement.remove();
    }

    if (source === 'remote') {
      return;
    }

    if (newRange) {
      this.editor.selection.setSelection(newRange.anchor, newRange.focus, { syncRender: false });
      return;
    }

    // 设置选区到合适的位置
    const container = getContainerById(this.editor, containerId);
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

  /**
   * 处理afterUpdateBlock事件
   */
  private handleAfterUpdateBlock(context: AfterUpdateBlockContext): void {
    const { blockData } = context;

    // 渲染处理
    const block = this.editor.getBlockById(blockData.id);
    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);

    if (blockClass.updateBlock) {
      blockClass.updateBlock(this.editor, block, blockData);
    }
  }

  /**
   * 处理afterInsertBox事件
   */
  private handleAfterInsertBox(context: AfterInsertBoxContext): void {
    const { containerId, blockIndex, newText, insertAction } = context;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const blockData = this.editor.editorDoc.getBlockData(containerId, blockIndex);
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');
    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);

    // 选区设置
    const newRange = transformSelection(this.editor, blockData.id, insertAction);
    this.editor.selection.setSelection(newRange.anchor, newRange.focus);
  }

  /**
   * 处理afterDeleteBox事件
   */
  private handleAfterDeleteBox(context: AfterDeleteBoxContext): void {
    const { containerId, blockIndex, newText } = context;

    // 渲染处理 - 重新渲染包含 box 的文本块
    const blockData = this.editor.editorDoc.getBlockData(containerId, blockIndex);
    const block = this.editor.getBlockById(blockData.id);
    assert(isTextKindBlock(this.editor, block), 'block is not text kind');
    const type = getBlockType(block);
    this.editor.editorBlocks.getBlockClass(type).setBlockText?.(this.editor, block, newText);
  }
}
