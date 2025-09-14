// Core library exports
export { Editor } from './editor/editor';
export { EditorDoc } from './doc/editor-doc';
export { Doc } from './doc/doc';
export { default as TextBlock } from './text/text-block';
export { EditorSelection } from './selection/editor-selection';
export { TextLine, LineBreaker } from './text/line/text-line';

// Types
export * from './index.type';

// Utils
export { assert } from './utils/assert';
export { genId as getId } from './utils/get-id';
export { parseShortcut } from './utils/key';
export { createElement, addClass, createRange, createExpandedRange, getParentScrollContainer } from './utils/dom';

// Box system exports
export { EditorBoxes } from './box/editor-boxes';
export {
  createBoxWrapper,
  isBoxWrapper,
  isBoxContent,
  getBoxId,
  getBoxType,
  canBoxWrap,
  getBoxContent
} from './box/box-dom';
export { isBoxOp, createBoxInsertOp } from './box/box-op';
export { MentionBox } from './box/extensions/mention-box';

// Mark system exports
export {
  BaseMark,
  SimpleMark,
  MarkManager,
  BoldMark,
  ItalicMark,
  UnderlineMark,
  StrikethroughMark,
  CodeMark,
  SuperscriptMark,
  SubscriptMark,
  ColorMark,
  BackgroundColorMark,
  FontSizeMark,
  LinkMark,
  getBuiltInMarks,
  type MarkRenderContext,
  type MarkApplyResult,
  type MarkOptions,
  type ConflictResolution,
  type MarkApplyOptions
} from './mark';
export { formatSelectedText, toggleTextFormat, applyMarkToSelection, toggleMark } from './text/format-text';

// Decorator
export {
  BaseDecorator,
  DecoratorManager,
  SearchHighlightDecorator,
  type DecoratorRenderContext,
  type DecoratorOptions
} from './decorator';

// hook
export { LifecycleHooks, type DocChangeContext, type HookContextMap } from './doc/hooks';
