import 'events';
import { TypedEmitter } from 'tiny-typed-emitter';
import EditorBlocks from './editor-blocks';
import { EditorDoc } from './editor-doc';
import { RootContainer } from '../container/root-container';
import { getChildBlocks, getContainerBlocksElement, getContainerById, getContainerId, getParentContainer } from '../container/container-dom';
import { createRootContainer } from '../container/create-root-container';
import TextBlock from '../text/text-block';
import { EditorInput } from './editor-input';
import { EditorSelection } from '../selection/editor-selection';
import { EditorShortcuts } from './editor-shortcut';
import { defaultShortcuts } from './default-shortcuts';
import { getBlockId, getBlockIndex, getLastBlock } from '../block/block-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { assert } from '../utils/assert';

import { DocBlock } from '../index.type';

export class Editor extends TypedEmitter<any> {
  parent: HTMLElement;

  doc: EditorDoc;

  rootContainerObject: RootContainer;

  rootContainer: HTMLElement;

  input: EditorInput;

  selection: EditorSelection;

  editorBlocks: EditorBlocks = new EditorBlocks(this);

  constructor(parent: HTMLElement, options: unknown) {
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
    return this.rootContainer.querySelector('[data-type=editor-block]') as HTMLElement;
  }

  getBlockById(id: string) {
    const block = this.findBlockById(id);
    assert(block, 'no block');
    return block as HTMLElement;
  }

  findBlockById(id: string): HTMLElement | null {
    const block = this.rootContainer.querySelector(`#${id}`) as HTMLElement;
    if (block) {
      // assert()
    }
    return block ?? null;
  }

  findBlockByIndex(containerId: string, index: number): HTMLElement | null {
    const container = getContainerById(this, containerId);
    const blocks = getChildBlocks(container);
    const block = blocks[index];
    return block ?? null;
  }

  getBlockData(blockElement: HTMLElement) {
    const container = getParentContainer(blockElement);
    const containerId = getContainerId(container);
    const blockIndex = getBlockIndex(blockElement);
    return this.doc.getBlockData(containerId, blockIndex);
  }

  getBlockTextLength(blockElement: HTMLElement) {
    const blockData = this.getBlockData(blockElement);
    const blockClass = this.editorBlocks.getBlockClass(blockData.type);
    return blockClass.getBlockTextLength(blockElement);
  }

  insertBlock(containerId: string, index: number, blockData: DocBlock) {
    this.doc.localInsertBlock(containerId, index, blockData);

    const blockElement = this.editorBlocks.createBlock([{ containerId, blockIndex: index }], this.rootContainer, blockData);

    const container = getContainerById(this, containerId);

    const blocksElements = getChildBlocks(container);
    const contentElement = getContainerBlocksElement(container);
    if (index === blocksElements.length || (index === 0 && blocksElements.length === 0)) {
      contentElement.appendChild(blockElement);
    } else {
      contentElement.insertBefore(blockElement, blocksElements[index]);
    }

    const pos = new EditorBlockPosition(blockData.id, 0);
    this.selection.setSelection(pos, pos);
  }

  deleteBlock(blockElement: HTMLElement) {
    const blockData = this.getBlockData(blockElement);
    const container = getParentContainer(blockElement);
    const containerId = getContainerId(container);
    const blockIndex = getBlockIndex(blockElement);
    this.doc.localDeleteBlock(containerId, blockIndex);

    const blockClass = this.editorBlocks.getBlockClass(blockData.type);
    if(blockClass.deleteBlock) {
      return blockClass.deleteBlock(this, blockElement);
    }
    blockElement.remove();

    const curIndexBlock = this.findBlockByIndex(containerId, blockIndex);
    if(curIndexBlock) {
      const curIndexBlockId = getBlockId(curIndexBlock);
      const pos = new EditorBlockPosition(curIndexBlockId, 0);
      this.selection.setSelection(pos, pos);
    } else {
      const lastBlock = getLastBlock(container);
      const lastBlockId = getBlockId(lastBlock);
      const pos = new EditorBlockPosition(lastBlockId, 0);
      this.selection.setSelection(pos, pos);
    }
  }
}
