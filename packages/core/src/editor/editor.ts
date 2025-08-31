import 'events';
import { TypedEmitter } from 'tiny-typed-emitter';
import EditorBlocks, { isTextKindBlock } from './editor-blocks';
import { EditorBoxes } from './editor-boxes';
import { EditorDoc } from './editor-doc';
import { RootContainer } from '../container/root-container';
import { getChildBlocks, getContainerById, getContainerId, getParentContainer } from '../container/container-dom';
import { createRootContainer } from '../container/create-root-container';
import TextBlock from '../text/text-block';
import { EditorInput } from './editor-input';
import { EditorSelection } from '../selection/editor-selection';
import { EditorShortcuts } from './editor-shortcut';
import { defaultShortcuts } from './default-shortcuts';
import { getBlockIndex, getFirstBlock } from '../block/block-dom';
import { EditorSelectionRange } from '../selection/selection-range';
import { assert } from '../utils/assert';
import { LineBreakerCacheManager } from '../text/line/line-breaker-cache';
import { MarkManager } from '../mark/mark-manager';
import { getBuiltInMarks } from '../mark/built-in-marks';
import { DecoratorManager } from '../decorator/decorator-manager';
import { getBuiltInDecorators } from '../decorator/built-in-decorators';
import { scrollIntoView } from '../utils/scroll-into-view';

import { BlockElement, BoxData, ContainerElement, DocBlock } from '../index.type';
import { Doc } from '../doc/doc';

export interface EditorOptions {
  initDoc?: Doc;
}

export class Editor extends TypedEmitter<any> {
  parent: HTMLElement;

  editorDoc: EditorDoc;

  rootContainerObject: RootContainer;

  rootContainer: ContainerElement;

  input: EditorInput;

  selection: EditorSelection;

  editorBlocks: EditorBlocks = new EditorBlocks(this);

  editorBoxes: EditorBoxes = new EditorBoxes();

  markManager: MarkManager;

  decoratorManager: DecoratorManager;

  lineBreakerCache: LineBreakerCacheManager;

  // 上下键导航的目标列位置状态
  private _targetColumnX: number | null = null;

  constructor(parent: HTMLElement, options: EditorOptions) {
    super();
    this.parent = parent;
    this.editorDoc = new EditorDoc(this, options.initDoc);
    this.editorBlocks.registerBlockClass(TextBlock);
    // 初始化Mark管理器
    this.markManager = new MarkManager(this);
    this.markManager.registerAll(getBuiltInMarks());

    // 初始化装饰器管理器
    this.decoratorManager = new DecoratorManager(this);
    this.decoratorManager.registerAll(getBuiltInDecorators());
    // this.options = options;
    this.input = new EditorInput(this);
    this.selection = new EditorSelection(this);

    this.rootContainerObject = createRootContainer(this);
    this.rootContainer = this.rootContainerObject.rootContainer;
    const shortcuts = new EditorShortcuts();
    this.input.addHandler(shortcuts);
    shortcuts.shortcuts = [defaultShortcuts];

    // 使用全局缓存管理器实例
    this.lineBreakerCache = new LineBreakerCacheManager();

  }

  focus(autoScroll: boolean = true) {
    if (autoScroll) {
      this.scrollIntoView();
    }
    this.input.focus({ preventScroll: true });
  }

  /**
   * 智能滚动到当前光标位置
   */
  scrollIntoView() {
    const range = this.selection.range;
    const focusPos = range.focus;
    const block = this.getBlockById(focusPos.blockId);

    if (!isTextKindBlock(this, block)) {
      return;
    }

    // 使用智能滚动工具
    scrollIntoView(this, focusPos, {
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
      margin: 20
    });
  }

  getFirstBlock() {
    return getFirstBlock(this.rootContainer);
  }

  getBlockById(id: string) {
    const block = this.findBlockById(id);
    assert(block, 'no block');
    return block as BlockElement;
  }

  findBlockById(id: string): BlockElement | null {
    const block = this.rootContainer.querySelector(`#${id}`) as BlockElement;
    return block ?? null;
  }

  findBlockByIndex(containerId: string, index: number): BlockElement | null {
    const container = getContainerById(this, containerId);
    const blocks = getChildBlocks(container);
    const block = blocks[index];
    return block ?? null;
  }

  getBlockData(blockElement: BlockElement) {
    const container = getParentContainer(blockElement);
    const containerId = getContainerId(container);
    const blockIndex = getBlockIndex(blockElement);
    return this.editorDoc.getBlockData(containerId, blockIndex);
  }

  getBlockTextLength(blockElement: BlockElement) {
    const blockData = this.getBlockData(blockElement);
    const blockClass = this.editorBlocks.getBlockClass(blockData.type);
    return blockClass.getBlockTextLength(blockElement);
  }

  insertBlock(containerId: string, index: number, blockData: DocBlock) {
    this.editorDoc.localInsertBlock(containerId, index, blockData);
  }

  deleteBlock(blockElement: BlockElement, newRange?: EditorSelectionRange) {
    const containerId = getContainerId(getParentContainer(blockElement));
    const blockIndex = getBlockIndex(blockElement);

    this.editorDoc.localDeleteBlock(containerId, blockIndex, newRange);
  }

  /**
   * 获取目标列位置的X坐标
   */
  getTargetColumnX(): number | null {
    return this._targetColumnX;
  }

  /**
   * 设置目标列位置的X坐标
   */
  setTargetColumnX(x: number): void {
    this._targetColumnX = x;
  }

  /**
   * 清除目标列位置状态
   */
  clearTargetColumnX(): void {
    this._targetColumnX = null;
  }

  /**
   * 更新目标列位置状态（基于当前光标位置）
   */
  updateTargetColumnX(): void {
    const range = this.selection.range;
    const focusPos = range.focus;
    const block = this.getBlockById(focusPos.blockId);
    assert(isTextKindBlock(this, block), 'not text kind block');

    const lineBreaker = this.lineBreakerCache.getLineBreaker(block);
    const position = lineBreaker.getCaretRect(focusPos);
    this.setTargetColumnX(position.left);
  }

  // ==================== Box API ====================

  /**
   * 插入 box 到当前光标位置
   * @param boxData box 数据
   */
  insertBox(boxData: BoxData): void {
    const pos = this.selection.range.start;
    const blockId = pos.blockId;
    const block = this.getBlockById(blockId);
    const blockIndex = getBlockIndex(block);
    const container = getParentContainer(block);
    const containerId = getContainerId(container);

    this.editorDoc.localInsertBox(containerId, blockIndex, pos.offset, boxData);
  }

  /**
   * 删除指定的 box
   */
  deleteBox(): void {
    const pos = this.selection.range.start;
    const blockId = pos.blockId;
    const block = this.getBlockById(blockId);
    const blockIndex = getBlockIndex(block);
    const container = getParentContainer(block);
    const containerId = getContainerId(container);

    this.editorDoc.localDeleteBox(containerId, blockIndex, pos.offset);
  }
}
