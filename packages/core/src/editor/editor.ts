import { TypedEmitter } from 'tiny-typed-emitter';
import EditorBlocks from '../block/editor-blocks';
import { EditorBoxes } from '../box/editor-boxes';
import { EditorDoc } from '../doc/editor-doc';
import { RootContainer } from '../container/root-container';
import { getChildBlocks, getContainerById, getContainerId, getParentContainer } from '../container/container-dom';
import { createRootContainer } from '../container/container-render';
import { TextBlock, isTextKindBlock, assertLineBreaker, LineBreaker } from '../text';
import { EditorInput } from './editor-input';
import { EditorSelection } from '../selection/editor-selection';
import { EditorShortcuts } from '../shortcuts/editor-shortcut';
import { defaultShortcuts } from '../shortcuts/default-shortcuts';
import { getBlockIndex, getFirstBlock } from '../block/block-dom';
import { EditorSelectionRange } from '../selection/selection-range';
import { MarkManager, getBuiltInMarks } from '../mark';
import { DecoratorManager, CompositionWidgetDecorator } from '../decorator';
import { assert } from '../utils/assert';
import { scrollIntoView } from '../utils/scroll-into-view';

import { BlockElement, BoxData, ContainerElement, DocBlock, EditorOptions } from '../index.type';
import { UndoManager } from '../undo-redo/undo-manager';
import EmbedBlock from '../embed/embed-block';

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

  undoManager: UndoManager;

  // 上下键导航的目标列位置状态
  private _targetColumnX: number | null = null;

  constructor(parent: HTMLElement, options: EditorOptions) {
    super();
    this.parent = parent;
    this.editorDoc = new EditorDoc(this, options.initDoc);
    this.editorBlocks.registerBlockClass(TextBlock);
    this.editorBlocks.registerBlockClass(EmbedBlock);
    // 初始化Mark管理器
    this.markManager = new MarkManager(this);
    this.markManager.registerAll(getBuiltInMarks());

    // 初始化装饰器管理器
    this.decoratorManager = new DecoratorManager(this);
    // this.decoratorManager.registerAll([new SearchHighlightDecorator()]);
    this.decoratorManager.registerAllWidgets([
      new CompositionWidgetDecorator()
    ]);

    // this.options = options;
    this.input = new EditorInput(this);
    this.selection = new EditorSelection(this);

    this.rootContainerObject = createRootContainer(this);
    this.rootContainer = this.rootContainerObject.rootContainer;
    const shortcuts = new EditorShortcuts();
    this.input.addHandler(shortcuts);
    shortcuts.shortcuts = [defaultShortcuts];

    this.undoManager = new UndoManager(this);
  }

  focus(autoScroll: boolean = true, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    if (autoScroll) {
      this.scrollIntoView(weakMap);
    }
    this.input.focus({ preventScroll: true });
  }

  /**
   * 智能滚动到当前光标位置
   */
  scrollIntoView(weakMap?: WeakMap<BlockElement, LineBreaker>) {
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
      margin: 20,
      weakMap
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
    return blockClass.getBlockTextLength(blockData);
  }

  insertBlock(containerId: string, index: number, blockData: DocBlock) {
    this.editorDoc.localInsertBlock(containerId, index, blockData);
  }

  deleteBlock(blockElement: BlockElement, newRange?: EditorSelectionRange) {
    const containerId = getContainerId(getParentContainer(blockElement));
    const blockIndex = getBlockIndex(blockElement);

    this.editorDoc.localDeleteBlock(containerId, blockIndex, newRange);
  }

  getChildBlocks(container: ContainerElement) {
    return getChildBlocks(container);
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
  updateTargetColumnX(weakMap?: WeakMap<BlockElement, LineBreaker>): void {
    const range = this.selection.range;
    const focusPos = range.focus;
    const block = this.getBlockById(focusPos.blockId);
    assert(isTextKindBlock(this, block), 'not text kind block');

    const lineBreaker = assertLineBreaker(block, weakMap);
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

  /**
   * 执行undo操作
   * @returns 是否成功执行
   */
  undo(): boolean {
    return this.undoManager.undo();
  }

  /**
   * 执行redo操作
   * @returns 是否成功执行
   */
  redo(): boolean {
    return this.undoManager.redo();
  }

  /**
   * 检查是否可以undo
   * @returns 是否可以undo
   */
  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  /**
   * 检查是否可以redo
   * @returns 是否可以redo
   */
  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /**
   * 获取undo/redo状态
   * @returns 当前状态信息
   */
  getUndoRedoState() {
    return this.undoManager.getState();
  }
}
