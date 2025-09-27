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
  attributes?: AttributeMap | BoxAttributeMap;
}

export interface DocBlockAttributes {
  [index: string]: unknown;
}

export type DocBlockText = DocBlockTextOp[];

export type DocBlock = {
  type: string;
  id: string;
  text?: DocBlockText;
} & DocBlockAttributes;

// Embed块专用数据类型
export interface DocEmbedBlock extends DocBlock {
  type: 'embed';
  embedType: string; // embed块的具体类型，如 'image', 'video', 'code' 等
  data: Record<string, any>; // embed块的数据
}

export interface DocObject {
  blocks: DocBlock[];
}

export type BlockKind = 'text' | 'embed' | 'complex';

export interface Block {
  blockType: string;
  blockKing: BlockKind;
  createBlockContent: (editor: Editor, path: BlockPath, container: Element, blockElement: BlockElement, block: DocBlock) => Element;
  deleteBlock?: (editor: Editor, block: BlockElement) => void;
  updateBlock?: (editor: Editor, block: BlockElement, blockData: DocBlock) => void;

  setBlockText?: (editor: Editor, block: BlockElement, text: DocBlockText) => void;

  getBlockTextLength: (block: DocBlock) => number;

  getRangeFormPoint: (editor: Editor, block: BlockElement, x: number, y: number, lineBreaker?: LineBreaker) => EditorBlockPosition;
  getCursorRect: (editor: Editor, block: BlockElement, position: EditorBlockPosition, lineBreaker?: LineBreaker) => DOMRect;
  updateSelection: (editor: Editor, block: BlockElement, from: number, to: number, lineBreaker?: LineBreaker) => void;
  // ...
}

export type BlockPathComponent = {
  containerId: string;
  blockIndex: number;
};

export type BlockPath = BlockPathComponent[];

export interface DocBlockTextActionOp {
  insert?: string;
  delete?: number;
  retain?: number;
  attributes?: AttributeMap;
}

export type DocBlockTextActions = DocBlockTextActionOp[];

export interface ShortcutsRecord {
  [key: string]: (editor: Editor, event: KeyboardEvent) => boolean;
}

export interface InputHandler {
  handleKeyDown?: (editor: Editor, event: KeyboardEvent) => boolean;
  handleInput?: (editor: Editor, event: InputEvent) => boolean;
  handleFocus?: (editor: Editor) => boolean;
  handleBlur?: (editor: Editor) => boolean;
}

export type ContainerElement = HTMLDivElement;
export type BlockElement = HTMLDivElement;
export type BlockContentElement = HTMLDivElement;
export type TextBlockContentChild = HTMLSpanElement;

export interface UndoManager {
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getState: () => any;
  executeInGroup: <T>(callback: () => T) => T;
}

// Editor related types
export interface EditorOptions {
  initDoc?: import('./doc/doc').Doc;
  initUndoManager:  (editor: Editor) => UndoManager;
}

/**
 * Editor 接口定义，用于避免循环引用
 */
export interface IEditor {
  // 属性
  parent: HTMLElement;
  editorDoc: any; // EditorDoc
  rootContainerObject: any; // RootContainer
  rootContainer: ContainerElement;
  input: any; // EditorInput
  selection: any; // EditorSelection
  editorBlocks: any; // EditorBlocks
  editorBoxes: any; // EditorBoxes
  markManager: any; // MarkManager
  decoratorManager: any; // DecoratorManager

  // 方法
  focus(autoScroll?: boolean, weakMap?: WeakMap<BlockElement, import('./text/line/text-line').LineBreaker>): void;
  scrollIntoView(weakMap?: WeakMap<BlockElement, import('./text/line/text-line').LineBreaker>): void;
  getFirstBlock(): BlockElement;
  getBlockById(id: string): BlockElement;
  findBlockById(id: string): BlockElement | null;
  findBlockByIndex(containerId: string, index: number): BlockElement | null;
  getBlockData(blockElement: BlockElement): DocBlock;
  getBlockTextLength(blockElement: BlockElement): number;
  insertBlock(containerId: string, index: number, blockData: DocBlock): void;
  deleteBlock(blockElement: BlockElement, newRange?: any): void; // EditorSelectionRange
  getTargetColumnX(): number | null;
  setTargetColumnX(x: number): void;
  clearTargetColumnX(): void;
  updateTargetColumnX(weakMap?: WeakMap<BlockElement, import('./text/line/text-line').LineBreaker>): void;
  insertBox(boxData: BoxData): void;
  deleteBox(): void;

  // 事件相关方法 (继承自 TypedEmitter)
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}
