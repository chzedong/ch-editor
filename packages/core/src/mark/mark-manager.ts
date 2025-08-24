import AttributeMap from 'quill-delta/dist/AttributeMap';
import { Editor } from '../editor/editor';
import { BaseMark, MarkRenderContext, MarkApplyResult } from './base-mark';
import { assert } from '../utils/assert';
import { TextBlockContentChild } from '../index.type';

/**
 * Mark冲突解决策略
 */
export type ConflictResolution = 'priority' | 'first' | 'last' | 'merge';

/**
 * Mark应用选项
 */
export interface MarkApplyOptions {
  /** 冲突解决策略 */
  conflictResolution?: ConflictResolution;
  /** 是否启用组合 */
  enableComposition?: boolean;
}

/**
 * Mark管理器
 */
export class MarkManager {
  private marks = new Map<string, BaseMark>();
  private marksByPriority: BaseMark[] = [];

  constructor(private editor: Editor) {}

  /**
   * 注册Mark
   */
  register(mark: BaseMark): void {
    const name = mark.name;

    if (this.marks.has(name)) {
      console.warn(`Mark '${name}' is already registered, overriding...`);
    }

    this.marks.set(name, mark);
    this.updatePriorityList();
  }

  /**
   * 批量注册Mark
   */
  registerAll(marks: BaseMark[]): void {
    marks.forEach(mark => this.register(mark));
  }

  /**
   * 注销Mark
   */
  unregister(name: string): boolean {
    const result = this.marks.delete(name);
    if (result) {
      this.updatePriorityList();
    }
    return result;
  }

  /**
   * 获取Mark
   */
  getMark(name: string): BaseMark | undefined {
    return this.marks.get(name);
  }

  /**
   * 检查Mark是否存在
   */
  hasMark(name: string): boolean {
    return this.marks.has(name);
  }

  /**
   * 获取所有注册的Mark
   */
  getAllMarks(): BaseMark[] {
    return Array.from(this.marks.values());
  }

  /**
   * 根据优先级获取Mark列表
   */
  getMarksByPriority(): BaseMark[] {
    return [...this.marksByPriority];
  }

  /**
   * 查找匹配的Mark
   */
  findMatchingMarks(key: string, value: any): BaseMark[] {
    const matches: BaseMark[] = [];

    for (const mark of this.marks.values()) {
      if (mark.matches(key, value)) {
        matches.push(mark);
      }
    }

    // 按优先级排序
    return matches.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 应用Mark到DOM元素
   */
  applyMarks(
    element: TextBlockContentChild,
    attributes: AttributeMap,
    options: MarkApplyOptions = {}
  ): MarkApplyResult[] {
    const results: MarkApplyResult[] = [];
    const appliedMarks = new Set<string>();
    const conflictGroups = new Map<string, BaseMark[]>();

    // 收集所有匹配的Mark
    const allMatches: { mark: BaseMark; key: string; value: any }[] = [];

    Object.entries(attributes).forEach(([key, value]) => {
      const matchingMarks = this.findMatchingMarks(key, value);
      matchingMarks.forEach(mark => {
        allMatches.push({ mark, key, value });
      });
    });

    // 检查冲突和互斥
    for (const { mark, key, value } of allMatches) {
      if (appliedMarks.has(mark.name)) {
        continue;
      }

      // 检查互斥
      let hasConflict = false;
      for (const appliedMarkName of appliedMarks) {
        const appliedMark = this.marks.get(appliedMarkName);
        if (appliedMark && (mark.excludes(appliedMarkName) || appliedMark.excludes(mark.name))) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        continue;
      }

      // 应用Mark
      const context: MarkRenderContext = {
        editor: this.editor,
        element,
        attributes,
        key,
        value
      };

      const result = mark.apply(context);
      if (result.applied) {
        this.applyMarkResult(element, result);
        results.push(result);
        appliedMarks.add(mark.name);
      }
    }

    return results;
  }

  /**
   * 创建Mark属性
   */
  createMarkAttributes(markName: string, params?: any): AttributeMap {
    const mark = this.getMark(markName);
    assert(mark, `Mark '${markName}' not found`);

    if (!mark.validate(params)) {
      throw new Error(`Invalid parameters for mark '${markName}'`);
    }

    return mark.createAttributes(params);
  }

  /**
   * 检查Mark组合是否有效
   */
  isValidCombination(markNames: string[]): boolean {
    const marks = markNames.map(name => this.getMark(name)).filter(Boolean) as BaseMark[];

    // 检查所有Mark是否都支持组合
    if (!marks.every(mark => mark.isComposable())) {
      return false;
    }

    // 检查互斥关系
    for (let i = 0; i < marks.length; i++) {
      for (let j = i + 1; j < marks.length; j++) {
        if (marks[i].excludes(marks[j].name) || marks[j].excludes(marks[i].name)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取Mark的依赖关系
   */
  getMarkDependencies(markName: string): string[] {
    // 这里可以扩展为支持Mark依赖关系
    return [];
  }

  /**
   * 清空所有Mark
   */
  clear(): void {
    this.marks.clear();
    this.marksByPriority = [];
  }

  /**
   * 更新优先级列表
   */
  private updatePriorityList(): void {
    this.marksByPriority = Array.from(this.marks.values())
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 应用Mark结果到DOM元素
   */
  private applyMarkResult(element: TextBlockContentChild, result: MarkApplyResult): void {
    // 应用CSS类
    if (result.classes && result.classes.length > 0) {
      element.classList.add(...result.classes);
    }

    // 应用data属性
    if (result.dataAttributes) {
      Object.entries(result.dataAttributes).forEach(([key, value]) => {
        element.setAttribute(`data-${key}`, value);
      });
    }

    // 应用其他属性
    if (result.attributes) {
      Object.entries(result.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    // 应用样式
    if (result.styles) {
      Object.entries(result.styles).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
    }
  }
}
