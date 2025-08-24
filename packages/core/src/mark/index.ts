// 基础Mark类和接口
export {
  BaseMark,
  SimpleMark,
  ParameterizedMark,
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
} from './built-in-marks';

// Mark组合和继承
export {
  ComposedMark,
  InheritedMark,
  MarkFactory,
  extendMarkManager,
  PREDEFINED_COMBINATIONS,
  type MarkCompositionConfig,
  type MarkInheritanceConfig
} from './mark-composition';