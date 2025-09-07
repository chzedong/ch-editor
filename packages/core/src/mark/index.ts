// 基础Mark类和接口
export {
  BaseMark,
  SimpleMark,
  type MarkRenderContext,
  type MarkApplyResult,
  type MarkOptions
} from './base-mark';

// Mark管理器
export {
  MarkManager,
  type ConflictResolution,
  type MarkApplyOptions
} from './mark-manager';

// 内置Mark实现
export {
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
  getBuiltInMarks
} from './extensions/built-in-marks';
