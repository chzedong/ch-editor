// 基础文本块类和接口
export {
  default as TextBlock,
  isTextKindBlock
} from './text-block';

// 文本操作相关
export {
  createInsertOp,
  createDeleteActions,
  isTextOp,
  splitToThree,
  getDocTextLength,
  isEmptyBlockText,
  getTextAttributes
} from './text-op';

// 文本动作和编辑
export {
  deleteText,
  editorInsertText
} from './text-action';

// 文本格式化
export {
  formatSelectedText,
  hasTextFormat,
  toggleTextFormat,
  applyMarkToSelection,
  toggleMark
} from './format-text';

// 文本DOM操作
export {
  removeBackgrounds,
  createBackgroundChild,
  getBlockBackground,
  getTextBlockContentChildTextLength,
  getTextBlockContentChildren,
  getTextBlockLength,
  isEmptyTextBlock
} from './text-dom';

// 文本渲染
export {
  updateBlockContent
} from './text-block-render';

// 选区渲染
export {
  updateSelection
} from './text-selection-render';

// 行处理相关
export {
  TextLine,
  LineBreaker,
  getTextCaretRect,
  getPositionFromPoint,
  assertLineBreaker,
  type LineItem,
  type TextLineItem,
  type BoxLineItem,
  type WidgetLineItem,
  type LineItemVirtualType,
  isWidgetLineItem,
  isTextLineItem,
  isBoxLineItem
} from './line/text-line';
