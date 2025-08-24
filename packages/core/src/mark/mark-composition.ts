import AttributeMap from 'quill-delta/dist/AttributeMap';
import { BaseMark, MarkRenderContext, MarkApplyResult, MarkOptions } from './base-mark';
import { MarkManager } from './mark-manager';

/**
 * Mark组合配置
 */
export interface MarkCompositionConfig {
  /** 组合名称 */
  name: string;
  /** 包含的Mark名称列表 */
  marks: string[];
  /** 组合优先级 */
  priority?: number;
  /** 组合时的冲突解决策略 */
  conflictResolution?: 'merge' | 'override' | 'ignore';
}

/**
 * 组合Mark类
 * 将多个Mark组合成一个新的Mark
 */
export class ComposedMark extends BaseMark {
  readonly name: string;
  private markNames: string[];
  private markManager: MarkManager;

  constructor(
    config: MarkCompositionConfig,
    markManager: MarkManager,
    options: MarkOptions = {}
  ) {
    super({
      priority: config.priority || 0,
      ...options
    });

    this.name = config.name;
    this.markNames = config.marks;
    this.markManager = markManager;
  }

  matches(key: string, value: any): boolean {
    // 检查是否有任何子Mark匹配
    return this.markNames.some(markName => {
      const mark = this.markManager.getMark(markName);
      return mark?.matches(key, value) || false;
    });
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    const results: MarkApplyResult[] = [];
    const combinedResult: MarkApplyResult = {
      applied: false,
      classes: [],
      dataAttributes: {},
      styles: {},
      attributes: {}
    };

    // 应用所有子Mark
    for (const markName of this.markNames) {
      const mark = this.markManager.getMark(markName);
      if (mark && mark.matches(context.key, context.value)) {
        const result = mark.apply(context);
        if (result.applied) {
          results.push(result);
          this.mergeResults(combinedResult, result);
        }
      }
    }

    combinedResult.applied = results.length > 0;
    return combinedResult;
  }

  createAttributes(params?: any): AttributeMap {
    const attributes: AttributeMap = {};

    // 合并所有子Mark的属性
    for (const markName of this.markNames) {
      const mark = this.markManager.getMark(markName);
      if (mark) {
        const markAttrs = mark.createAttributes(params);
        Object.assign(attributes, markAttrs);
      }
    }

    return attributes;
  }

  /**
   * 合并Mark应用结果
   */
  private mergeResults(target: MarkApplyResult, source: MarkApplyResult): void {
    if (source.classes) {
      target.classes = [...(target.classes || []), ...source.classes];
    }

    if (source.dataAttributes) {
      target.dataAttributes = { ...target.dataAttributes, ...source.dataAttributes };
    }

    if (source.styles) {
      target.styles = { ...target.styles, ...source.styles };
    }

    if (source.attributes) {
      target.attributes = { ...target.attributes, ...source.attributes };
    }
  }
}

/**
 * Mark继承配置
 */
export interface MarkInheritanceConfig {
  /** 新Mark名称 */
  name: string;
  /** 继承的基础Mark名称 */
  baseMark: string;
  /** 覆盖的选项 */
  overrides?: Partial<MarkOptions>;
  /** 自定义匹配逻辑 */
  customMatches?: (key: string, value: any, baseMatches: boolean) => boolean;
  /** 自定义应用逻辑 */
  customApply?: (context: MarkRenderContext, baseResult: MarkApplyResult) => MarkApplyResult;
}

/**
 * 继承Mark类
 * 基于现有Mark创建新的Mark变体
 */
export class InheritedMark extends BaseMark {
  readonly name: string;
  private baseMark: BaseMark;
  private config: MarkInheritanceConfig;

  constructor(
    config: MarkInheritanceConfig,
    baseMark: BaseMark
  ) {
    super({
      ...baseMark.options,
      ...config.overrides
    });

    this.name = config.name;
    this.baseMark = baseMark;
    this.config = config;
  }

  matches(key: string, value: any): boolean {
    const baseMatches = this.baseMark.matches(key, value);

    if (this.config.customMatches) {
      return this.config.customMatches(key, value, baseMatches);
    }

    return baseMatches;
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    const baseResult = this.baseMark.apply(context);

    if (this.config.customApply) {
      return this.config.customApply(context, baseResult);
    }

    return baseResult;
  }

  createAttributes(params?: any): AttributeMap {
    return this.baseMark.createAttributes(params);
  }
}

/**
 * Mark工厂类
 * 提供便捷的Mark创建和组合方法
 */
export class MarkFactory {
  constructor(private markManager: MarkManager) {}

  /**
   * 创建组合Mark
   */
  createComposedMark(config: MarkCompositionConfig, options?: MarkOptions): ComposedMark {
    // 验证所有子Mark都存在
    for (const markName of config.marks) {
      if (!this.markManager.hasMark(markName)) {
        throw new Error(`Mark '${markName}' not found for composition`);
      }
    }

    // 验证组合是否有效
    if (!this.markManager.isValidCombination(config.marks)) {
      throw new Error(`Invalid mark combination: ${config.marks.join(', ')}`);
    }

    return new ComposedMark(config, this.markManager, options);
  }

  /**
   * 创建继承Mark
   */
  createInheritedMark(config: MarkInheritanceConfig): InheritedMark {
    const baseMark = this.markManager.getMark(config.baseMark);
    if (!baseMark) {
      throw new Error(`Base mark '${config.baseMark}' not found`);
    }

    return new InheritedMark(config, baseMark);
  }

  /**
   * 创建Mark变体（快捷方法）
   */
  createVariant(
    baseName: string,
    variantName: string,
    customizer: (baseMark: BaseMark) => Partial<MarkInheritanceConfig>
  ): InheritedMark {
    const baseMark = this.markManager.getMark(baseName);
    if (!baseMark) {
      throw new Error(`Base mark '${baseName}' not found`);
    }

    const config: MarkInheritanceConfig = {
      name: variantName,
      baseMark: baseName,
      ...customizer(baseMark)
    };

    return new InheritedMark(config, baseMark);
  }

  /**
   * 批量创建Mark组合
   */
  createMarkCombinations(combinations: MarkCompositionConfig[]): ComposedMark[] {
    return combinations.map(config => this.createComposedMark(config));
  }
}

/**
 * 预定义的Mark组合
 */
export const PREDEFINED_COMBINATIONS: MarkCompositionConfig[] = [
  {
    name: 'boldItalic',
    marks: ['bold', 'italic'],
    priority: 15
  },
  {
    name: 'boldUnderline',
    marks: ['bold', 'underline'],
    priority: 15
  },
  {
    name: 'italicUnderline',
    marks: ['italic', 'underline'],
    priority: 15
  },
  {
    name: 'boldItalicUnderline',
    marks: ['bold', 'italic', 'underline'],
    priority: 20
  }
];

/**
 * 扩展MarkManager以支持组合和继承
 */
export function extendMarkManager(markManager: MarkManager): MarkManager & {
  factory: MarkFactory;
  registerComposition: (config: MarkCompositionConfig, options?: MarkOptions) => void;
  registerInheritance: (config: MarkInheritanceConfig) => void;
} {
  const factory = new MarkFactory(markManager);

  const extended = markManager as any;
  extended.factory = factory;

  extended.registerComposition = function(config: MarkCompositionConfig, options?: MarkOptions) {
    const composedMark = factory.createComposedMark(config, options);
    this.register(composedMark);
  };

  extended.registerInheritance = function(config: MarkInheritanceConfig) {
    const inheritedMark = factory.createInheritedMark(config);
    this.register(inheritedMark);
  };

  return extended;
}
