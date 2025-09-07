import { Editor } from '../editor/editor';
import { EditorSelectionRange } from '../selection/selection-range';

import { TextBlockContentChild } from '../index.type';

/**
 * 装饰器渲染上下文
 */
export interface DecoratorRenderContext {
  /** 编辑器实例 */
  editor: Editor;
  /** 当前渲染的DOM元素 */
  element: TextBlockContentChild;
  /** 当前块的ID */
  blockId: string;
  /** 当前文本在块中的起始偏移量 */
  startOffset: number;
  /** 当前文本在块中的结束偏移量 */
  endOffset: number;
  /** 编辑器当前选区 */
  selection: EditorSelectionRange;
}

/**
 * 装饰器范围描述
 */
export interface DecoratorRange {
  /** 起始偏移量 */
  start: number;
  /** 结束偏移量 */
  end: number;
  /** 装饰器实例 */
  decorator: BaseDecorator;
}

/**
 * 装饰器配置选项
 */
export interface DecoratorOptions {
  /** 装饰器的优先级，数字越大优先级越高 */
  priority?: number;
  /** 是否可以与其他装饰器组合 */
  composable?: boolean;
  /** 互斥的装饰器类型 */
  excludes?: string[];
}

export interface WidgetOptions extends DecoratorOptions {
  /** 是否可以折行 */
  wrap?: boolean;
  /** 定义索引位置 */
  indexPosition?: 'before' | 'after';
}

/**
 * 装饰器应用结果
 */
export interface DecoratorApplyResult {
  /** 是否成功应用 */
  success: boolean;
  /** 错误信息（如果应用失败） */
  error?: string;
  /** 应用的装饰器数据 */
  decoratorData?: any;
}

/**
 * Widget渲染上下文
 */
export interface WidgetRenderContext {
  /** 编辑器实例 */
  editor: Editor;
  /** 当前块的ID */
  blockId: string;
  /** Widget在块中的位置偏移量 */
  offset: number;
  /** 编辑器当前选区 */
  selection: EditorSelectionRange;
  /** Widget的自定义数据 */
  data?: any;
}

/**
 * Widget范围描述
 */
export interface WidgetRange {
  /** Widget在文本中的位置 */
  position: number;
  /** Widget装饰器实例 */
  decorator: WidgetDecorator;
  /** Widget的自定义数据 */
  data?: any;
}

/**
 * 装饰器基础抽象类
 */
export abstract class BaseDecorator {
  /** 装饰器的唯一标识符 */
  abstract readonly name: string;

  /** 装饰器的配置选项 */
  readonly options: DecoratorOptions;

  constructor(options: DecoratorOptions = {}) {
    this.options = {
      priority: 0,
      composable: true,
      ...options
    };
  }

  /**
   * 应用装饰器到DOM元素
   * @param editor 编辑器实例
   * @param element 要装饰的DOM元素
   */
  abstract apply(editor: Editor, element: TextBlockContentChild): void;

  /**
   * 计算装饰器应该应用的范围
   * @param context 渲染上下文
   * @returns 装饰器范围列表
   */
  abstract calculateRanges(context: Omit<DecoratorRenderContext, 'element' | 'startOffset' | 'endOffset'>): DecoratorRange[];

  /**
   * 获取装饰器的优先级
   */
  getPriority(): number {
    return this.options.priority || 0;
  }

  /**
   * 检查是否可以与其他装饰器组合
   */
  isComposable(): boolean {
    return this.options.composable !== false;
  }

  /**
   * 检查是否与指定装饰器互斥
   */
  excludes(decoratorName: string): boolean {
    return this.options.excludes?.includes(decoratorName) || false;
  }

  /**
   * 清理装饰器资源（可选）
   */
  dispose?(): void;
}

/**
 * Widget装饰器抽象类
 * Widget是一种特殊的装饰器，用于在文本中插入独立的渲染节点
 */
export abstract class WidgetDecorator {
  /** Widget装饰器的唯一标识符 */
  abstract readonly name: string;

  /** Widget装饰器的配置选项 */
  readonly options: WidgetOptions;

  constructor(options: WidgetOptions = {}) {
    this.options = {
      priority: 0,
      composable: true,
      wrap: false,
      indexPosition: 'before',
      ...options
    };
  }

  /**
   * 渲染Widget到DOM元素
   * @param data Widget数据
   * @returns 渲染的DOM元素
   */
  abstract render(data: any): HTMLElement;

  /**
   * 计算Widget应该插入的位置
   * @param context 渲染上下文（不包含element相关信息）
   * @returns Widget范围列表
   */
  abstract calculateWidgetRanges(context: Omit<WidgetRenderContext, 'offset' | 'data'>): WidgetRange[];

  /**
   * 获取Widget装饰器的优先级
   */
  getPriority(): number {
    return this.options.priority || 0;
  }

  /**
   * 检查是否可以与其他装饰器组合
   */
  isComposable(): boolean {
    return this.options.composable !== false;
  }

  /**
   * 检查是否与指定装饰器互斥
   */
  excludes(decoratorName: string): boolean {
    return this.options.excludes?.includes(decoratorName) || false;
  }

  /**
   * 清理Widget装饰器资源（可选）
   */
  dispose?(): void;
}
