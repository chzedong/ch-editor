import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from '../editor/editor';
import { TextBlockContentChild } from '../index.type';

/**
 * Mark渲染上下文
 */
export interface MarkRenderContext {
  editor: Editor;
  element: TextBlockContentChild;
  attributes: AttributeMap;
  key: string;
  value: any;
}

/**
 * Mark应用结果
 */
export interface MarkApplyResult {
  /** 是否应用了样式 */
  applied: boolean;
  /** 添加的CSS类名 */
  classes?: string[];
  /** 添加的data属性 */
  dataAttributes?: Record<string, string>;
  /** 添加的style属性 */
  styles?: Record<string, string>;
  /** 其他DOM属性 */
  attributes?: Record<string, string>;
}

/**
 * Mark配置选项
 */
export interface MarkOptions {
  /** Mark的优先级，数字越大优先级越高 */
  priority?: number;
  /** 是否可以与其他Mark组合 */
  composable?: boolean;
  /** 互斥的Mark类型 */
  excludes?: string[];
}

/**
 * Mark基础抽象类
 */
export abstract class BaseMark {
  /** Mark的唯一标识符 */
  abstract readonly name: string;

  /** Mark的配置选项 */
  readonly options: MarkOptions;

  constructor(options: MarkOptions = {}) {
    this.options = {
      priority: 0,
      composable: true,
      excludes: [],
      ...options
    };
  }

  /**
   * 检查属性是否匹配此Mark
   * @param key 属性键
   * @param value 属性值
   * @returns 是否匹配
   */
  abstract matches(key: string, value: any): boolean;

  /**
   * 应用Mark到DOM元素
   * @param context 渲染上下文
   * @returns 应用结果
   */
  abstract apply(context: MarkRenderContext): MarkApplyResult;

  /**
   * 生成属性键值对
   * @param params 参数
   * @returns 属性映射
   */
  abstract createAttributes(params?: any): AttributeMap;

  /**
   * 获取Mark的优先级
   */
  getPriority(): number {
    return this.options.priority || 0;
  }

  /**
   * 检查是否可以与其他Mark组合
   */
  isComposable(): boolean {
    return this.options.composable !== false;
  }

  /**
   * 检查是否与指定Mark互斥
   */
  excludes(markName: string): boolean {
    return this.options.excludes?.includes(markName) || false;
  }

  /**
   * 验证Mark参数
   * @param params 参数
   * @returns 是否有效
   */
  validate(params?: any): boolean {
    return true;
  }

  /**
   * 获取Mark的描述信息
   */
  getDescription(): string {
    return `Mark: ${this.name}`;
  }
}

/**
 * 简单Mark基类，用于基础样式Mark
 */
export abstract class SimpleMark extends BaseMark {
  /** 对应的CSS类名 */
  abstract readonly className: string;

  /** 对应的属性键 */
  abstract readonly attributeKey: string;

  matches(key: string, value: any): boolean {
    return key === this.attributeKey && value === true;
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    return {
      applied: true,
      classes: [this.className]
    };
  }

  createAttributes(): AttributeMap {
    return { [this.attributeKey]: true };
  }
}

/**
 * 参数化Mark基类，用于需要参数的Mark（如颜色、链接等）
 */
export abstract class ParameterizedMark extends BaseMark {
  /** 属性键前缀 */
  abstract readonly attributePrefix: string;

  matches(key: string, value: any): boolean {
    return key.startsWith(this.attributePrefix) && value === true;
  }

  /**
   * 从属性键中提取参数
   */
  protected extractParameter(key: string): string {
    return key.substring(this.attributePrefix.length);
  }

  /**
   * 根据参数生成属性键
   */
  protected generateAttributeKey(parameter: string): string {
    return this.attributePrefix + parameter;
  }

  createAttributes(parameter: string): AttributeMap {
    if (!parameter) {
      throw new Error(`Parameter is required for ${this.name} mark`);
    }
    return { [this.generateAttributeKey(parameter)]: true };
  }
}
