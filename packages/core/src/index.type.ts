import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from './editor/editor';
import { EditorBlockPosition } from './selection/block-position';
import { LineBreaker } from './main';

export interface BoxData {
  /** Box 的唯一标识符 */
  id: string;
  /** Box 的类型，如 'image', 'formula', 'embed' 等 */
  type: string;
  /** Box 的属性数据 */
  attributes?: AttributeMap;
  /** Box 的内容数据 */
  data?: Record<string, any>;
  /** Box 的渲染宽度（可选，用于布局计算） */
  width?: number;
  /** Box 的渲染高度（可选，用于布局计算） */
  height?: number;
}
/**
 * 扩展的 DocBlockTextOp，支持 box 插入
 */

export interface BoxAttributeMap extends AttributeMap {
  /** 插入 box 时使用 */
  insertBox: BoxData;
}

export interface DocBlockTextOp {
  insert: string;
  attributes?: AttributeMap | BoxAttributeMap
}


export interface DocBlockAttributes {
  [index: string]: unknown;
}

export type DocBlockText = DocBlockTextOp[]

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

  getRangeFormPoint: (editor: Editor, block: BlockElement, x: number, y: number, lineBreaker?: LineBreaker) => EditorBlockPosition;
  getCursorRect: (editor: Editor, block: BlockElement, position: EditorBlockPosition, lineBreaker?: LineBreaker) => DOMRect;
  updateSelection: (editor: Editor, block: BlockElement, from: number, to: number, lineBreaker?: LineBreaker) => void;
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
