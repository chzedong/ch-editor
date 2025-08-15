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
  createBlockContent: (editor: Editor, path: BlockPath, container: Element, blockElement: HTMLElement, block: DocBlock) => Element
  setBlockText: (editor: Editor, block: HTMLElement, text: DocBlockText) => void;
  getBlockTextLength: (block: HTMLElement) => number;
  getRangeFormPoint: (block: HTMLElement, x: number, y: number) => EditorBlockPosition;
  updateSelection: (editor: Editor, block: HTMLElement, from: number, to: number) => void;
  deleteBlock?: (editor: Editor, block: HTMLElement) => void;
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

export type BlockElement = HTMLElement;

export type TextBlockContentChild = Element;
