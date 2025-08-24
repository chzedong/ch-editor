import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from './editor/editor';
import { EditorBlockPosition } from './selection/block-position';

export interface DocBlockTextOp {
  insert: string;
  attributes?: AttributeMap
}

export type DocBlockText = DocBlockTextOp[]

export interface DocBlockAttributes {
  [index: string]: unknown;
}

export type DocBlock = {
  type: string;
  id: string;
  text?: DocBlockText;
} & DocBlockAttributes;

export interface DocObject {
  blocks: DocBlock[];
}

export type BlockKind = 'text' | 'embed' | 'complex'

export interface Block {
  blockType: string;
  blockKing: BlockKind;
  createBlockContent: (editor: Editor, path: BlockPath, container: Element, blockElement: BlockElement, block: DocBlock) => Element
  deleteBlock?: (editor: Editor, block: BlockElement) => void;

  setBlockText: (editor: Editor, block: BlockElement, text: DocBlockText) => void;

  getBlockTextLength: (block: BlockElement) => number;

  getRangeFormPoint: (block: BlockElement, x: number, y: number) => EditorBlockPosition;
  getCursorRect: (block: BlockElement, position: EditorBlockPosition) => DOMRect;

  updateSelection: (editor: Editor, block: BlockElement, from: number, to: number) => void;
  // ...
}

export type BlockPathComponent = {
  containerId: string;
  blockIndex: number;
}

export type BlockPath = BlockPathComponent[]

export interface DocBlockTextActionOp {
  insert?: string;
  delete?: number;
  retain?: number;
  attributes?: AttributeMap;
}

export type DocBlockTextActions = DocBlockTextActionOp[]

export interface ShortcutsRecord {
  [key: string]: (editor: Editor, event: KeyboardEvent) => boolean;
}

export interface InputHandler {
  handleKeyDown: (editor: Editor, event: KeyboardEvent) => boolean;
}

export type ContainerElement = HTMLDivElement;
export type BlockElement = HTMLDivElement;
export type BlockContentElement = HTMLDivElement;
export type TextBlockContentChild = HTMLSpanElement;
