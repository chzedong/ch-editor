import { DocBlock, DocBlockTextActions, BoxData } from '@ch-editor/core';
import { SelectionRangeSnapshot } from '@ch-editor/core/src/selection/selection-range';

/**
 * 操作类型枚举
 * 参考Redux DevTools和ProseMirror的操作分类
 */
export enum OperationType {
  // 块操作
  BLOCK_INSERT = 'block_insert',
  BLOCK_DELETE = 'block_delete',
  BLOCK_UPDATE = 'block_update',

  // Box操作
  BOX_INSERT = 'box_insert',
  BOX_DELETE = 'box_delete',

  // 选区操作
  SELECTION_CHANGE = 'selection_change',

  // 复合操作
  // PASTE = 'paste',
  // CUT = 'cut',
  // COPY = 'copy',
  // UNDO = 'undo',
  // REDO = 'redo',

  // 用户交互
  MOUSE_CLICK = 'mouse_click',
  // MOUSE_DRAG = 'mouse_drag',
  KEY_PRESS = 'key_press',

  // 系统操作
  FOCUS = 'focus',
  BLUR = 'blur',
  // SCROLL = 'scroll'
}

/**
 * 操作来源类型
 */
export enum OperationSource {
  USER = 'user',           // 用户直接操作
  PROGRAMMATIC = 'programmatic', // 程序调用
  SYSTEM = 'system',       // 系统触发
  COLLABORATION = 'collaboration' // 协作同步
}

/**
 * 基础操作记录接口
 */
export interface BaseOperationRecord {
  id: string;
  type: OperationType;
  source: OperationSource;
  timestamp: number;

  // 操作上下文
  containerId: string;
  blockIndex: number;
  blockId?: string;

  // 选区信息
  beforeSelection?: SelectionRangeSnapshot;
  afterSelection?: SelectionRangeSnapshot;
}

/**
 * 块操作记录
 */
export interface BlockOperationRecord extends BaseOperationRecord {
  type: OperationType.BLOCK_INSERT | OperationType.BLOCK_DELETE | OperationType.BLOCK_UPDATE;
  textActions?: DocBlockTextActions;

  // 块数据
  beforeBlock?: DocBlock;
  afterBlock?: DocBlock;
}

/**
 * Box操作记录
 */
export interface BoxOperationRecord extends BaseOperationRecord {
  type: OperationType.BOX_INSERT | OperationType.BOX_DELETE;

  // Box数据
  boxData: BoxData;
  beforeBoxData?: BoxData;

  // Box位置
  offset: number;
}

/**
 * 选区操作记录
 */
export interface SelectionOperationRecord extends BaseOperationRecord {
  type: OperationType.SELECTION_CHANGE;

  // 是否是垂直导航
  isVerticalNavigation?: boolean;
}

/**
 * 用户交互操作记录
 */
export interface InteractionOperationRecord extends BaseOperationRecord {
  type: OperationType.MOUSE_CLICK | OperationType.KEY_PRESS;

  // 事件详情
  eventType: string;
  eventData: {
    key?: string;
    keyCode?: number;
    clientX?: number;
    clientY?: number;
    button?: number;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  };
}

/**
 * 系统操作记录
 */
export interface SystemOperationRecord extends BaseOperationRecord {
  type: OperationType.FOCUS | OperationType.BLUR;
}

/**
 * 联合操作记录类型
 */
export type OperationRecord =
  | BlockOperationRecord
  | BoxOperationRecord
  | SelectionOperationRecord
  | InteractionOperationRecord
  | SystemOperationRecord;

/**
 * 操作过滤器配置
 */
export interface OperationFilter {
  types?: OperationType[];
  sources?: OperationSource[];
  timeRange?: {
    start: number;
    end: number;
  };
  containerId?: string;
  blockId?: string;
}

/**
 * 操作统计信息
 */
export interface OperationStats {
  totalOperations: number;
  operationsByType: Record<OperationType, number>;
  operationsBySource: Record<OperationSource, number>;
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * 操作记录器配置
 */
export interface OperationLoggerConfig {
  // 最大记录数量
  maxRecords: number;

  // 是否记录调用栈
  captureStackTrace: boolean;

  // 过滤器
  filter?: OperationFilter;

  // 是否启用性能监控
  enablePerformanceMonitoring: boolean;

  // 自动清理间隔（毫秒）
  autoCleanupInterval: number;
}
