// Core library exports
export { Editor } from './editor/editor';
export { default as TextBlock } from './text/text-block';
export { EditorSelection } from './selection/editor-selection';
export { TextLine } from './line';

// Types
export type {
  DocBlock,
  DocBlockTextOp,
  Block,
  BlockPath,
  ShortcutsRecord,
  InputHandler
} from './index.type';

// Utils
export { assert } from './utils/assert';
export { genId as getId } from './utils/get-id';
export * from './utils/key';
export * from './utils/dom';

// Import styles
import './caret/caret.scss';
import './block/block.scss';
import './style.scss';

