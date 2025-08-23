import 'events';
import { TypedEmitter } from 'tiny-typed-emitter';
import EditorBlocks, { isTextKindBlock } from './editor-blocks';
import { EditorDoc } from './editor-doc';
import { RootContainer } from '../container/root-container';
import { getChildBlocks, getContainerBlocksElement, getContainerById, getContainerId, getParentContainer } from '../container/container-dom';
import { createRootContainer } from '../container/create-root-container';
import TextBlock from '../text/text-block';
import { EditorInput } from './editor-input';
import { EditorSelection } from '../selection/editor-selection';
import { EditorShortcuts } from './editor-shortcut';
import { defaultShortcuts } from './default-shortcuts';
import { getBlockId, getBlockIndex, getFirstBlock, getLastBlock } from '../block/block-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { EditorSelectionRange } from '../selection/selection-range';
import { assert } from '../utils/assert';
import { LineBreaker } from '../text/line/text-line';

import { BlockElement, ContainerElement, DocBlock } from '../index.type';

export class Editor extends TypedEmitter<any> {
  parent: HTMLElement;

  doc: EditorDoc;

  rootContainerObject: RootContainer;

  rootContainer: ContainerElement;

  input: EditorInput;

  selection: EditorSelection;

  editorBlocks: EditorBlocks = new EditorBlocks(this);

  // 上下键导航的目标列位置状态
  private _targetColumnX: number | null = null;

  constructor(parent: HTMLElement, options: any) {
    super();
    this.parent = parent;
    this.doc = new EditorDoc(this, options.initDoc);
    // this.options = options;
    this.editorBlocks.registerBlockClass(TextBlock);
    this.rootContainerObject = createRootContainer(this);
    this.rootContainer = this.rootContainerObject.rootContainer;
    this.input = new EditorInput(this);
    this.selection = new EditorSelection(this);
    const shortcuts = new EditorShortcuts();
    this.input.addHandler(shortcuts);
    shortcuts.shortcuts = [defaultShortcuts];
  }

  focus() {
    this.input.focus();
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
    return this.doc.getBlockData(containerId, blockIndex);
  }

  getBlockTextLength(blockElement: BlockElement) {
    const blockData = this.getBlockData(blockElement);
    const blockClass = this.editorBlocks.getBlockClass(blockData.type);
    return blockClass.getBlockTextLength(blockElement);
  }

  insertBlock(containerId: string, index: number, blockData: DocBlock) {
    this.doc.localInsertBlock(containerId, index, blockData);
  }

  deleteBlock(blockElement: BlockElement, newRange?: EditorSelectionRange) {
    const containerId = getContainerId(getParentContainer(blockElement));
    const blockIndex = getBlockIndex(blockElement);

    this.doc.localDeleteBlock(containerId, blockIndex, newRange);
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

    const lineBreaker = new LineBreaker(block);
    const position = lineBreaker.getCaretRect(focusPos);
    this.setTargetColumnX(position.left);
  }
}
