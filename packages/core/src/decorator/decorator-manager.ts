import { Editor } from '../editor/editor';
import { BaseDecorator, DecoratorRange, WidgetDecorator, WidgetRange } from './base-decorator';

import { TextBlockContentChild } from '../index.type';
import { createWidgetWrapper } from './decorator-dom';

/**
 * 装饰器管理器
 */
export class DecoratorManager {
  private decorators = new Map<string, BaseDecorator>();
  private decoratorsByPriority: BaseDecorator[] = [];
  private widgetDecorators = new Map<string, WidgetDecorator>();
  private widgetDecoratorsByPriority: WidgetDecorator[] = [];

  constructor(private editor: Editor) {}

  /**
   * 注册装饰器
   */
  register(decorator: BaseDecorator): void {
    const name = decorator.name;

    if (this.decorators.has(name)) {
      console.warn(`Decorator '${name}' is already registered, overriding...`);
    }

    this.decorators.set(name, decorator);
    this.updatePriorityList();
  }

  /**
   * 批量注册装饰器
   */
  registerAll(decorators: BaseDecorator[]): void {
    decorators.forEach((decorator) => {
      this.decorators.set(decorator.name, decorator);
    });
    this.updatePriorityList();
  }

  /**
   * 注册widget装饰器
   */
  registerWidget(decorator: WidgetDecorator): void {
    const name = decorator.name;

    if (this.widgetDecorators.has(name)) {
      console.warn(`Widget decorator '${name}' is already registered, overriding...`);
    }

    this.widgetDecorators.set(name, decorator);
    this.updateWidgetPriorityList();
  }

  /**
   * 批量注册widget装饰器
   */
  registerAllWidgets(decorators: WidgetDecorator[]): void {
    decorators.forEach((decorator) => {
      this.widgetDecorators.set(decorator.name, decorator);
    });
    this.updateWidgetPriorityList();
  }

  /**
   * 注销装饰器
   */
  unregister(name: string): void {
    const decorator = this.decorators.get(name);
    if (decorator) {
      // 清理资源
      if (decorator.dispose) {
        decorator.dispose();
      }
      this.decorators.delete(name);
      this.updatePriorityList();
    }
  }

  /**
   * 注销widget装饰器
   */
  unregisterWidget(name: string): void {
    const decorator = this.widgetDecorators.get(name);
    if (decorator) {
      // 清理资源
      if (decorator.dispose) {
        decorator.dispose();
      }
      this.widgetDecorators.delete(name);
      this.updateWidgetPriorityList();
    }
  }

  /**
   * 获取装饰器
   */
  getDecorator(name: string): BaseDecorator | undefined {
    return this.decorators.get(name);
  }

  /**
   * 检查装饰器是否存在
   */
  hasDecorator(name: string): boolean {
    return this.decorators.has(name);
  }

  /**
   * 获取所有注册的装饰器
   */
  getAllDecorators(): BaseDecorator[] {
    return Array.from(this.decorators.values());
  }

  /**
   * 根据优先级获取装饰器列表
   */
  getDecoratorsByPriority(): BaseDecorator[] {
    return [...this.decoratorsByPriority];
  }

  /**
   * 获取widget装饰器
   */
  getWidgetDecorator(name: string): WidgetDecorator | undefined {
    return this.widgetDecorators.get(name);
  }

  /**
   * 检查widget装饰器是否存在
   */
  hasWidgetDecorator(name: string): boolean {
    return this.widgetDecorators.has(name);
  }

  /**
   * 获取所有注册的widget装饰器
   */
  getAllWidgetDecorators(): WidgetDecorator[] {
    return Array.from(this.widgetDecorators.values());
  }

  /**
   * 根据优先级获取widget装饰器列表
   */
  getWidgetDecoratorsByPriority(): WidgetDecorator[] {
    return [...this.widgetDecoratorsByPriority];
  }

  /**
   * 计算块文本的装饰器范围
   */
  calculateDecoratorRanges(blockId: string, textLength: number): DecoratorRange[] {
    const allRanges: DecoratorRange[] = [];
    const selection = this.editor.selection.range;

    const baseContext = {
      editor: this.editor,
      blockId,
      selection
    };

    // 收集所有装饰器的范围
    for (const decorator of this.decoratorsByPriority) {
      const ranges = decorator.calculateRanges(baseContext);
      allRanges.push(...ranges);
    }

    // 过滤和规范化范围
    return allRanges
      .filter((range) => range.start < textLength && range.end > 0)
      .map((range) => ({
        ...range,
        start: Math.max(0, range.start),
        end: Math.min(textLength, range.end)
      }))
      .filter((range) => range.start < range.end);
  }

  /**
   * 计算widget装饰器范围
   */
  calculateWidgetRanges(blockId: string, textLength: number): WidgetRange[] {
    const allRanges: WidgetRange[] = [];
    const selection = this.editor.selection.range;

    const baseContext = {
      editor: this.editor,
      blockId,
      selection
    };

    // 收集所有widget装饰器的范围
    for (const decorator of this.widgetDecoratorsByPriority) {
      const ranges = decorator.calculateWidgetRanges(baseContext);
      allRanges.push(...ranges);
    }

    // 过滤和规范化范围
    return allRanges
      .filter((range) => range.position >= 0 && range.position <= textLength)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * 应用装饰器到DOM元素的实现
   */
  applyDecorators(
    element: TextBlockContentChild,
    context: {
      decorators: BaseDecorator[];
      segment?: any;
    }
  ): void {
    const { decorators } = context;

    // 直接应用提供的装饰器
    for (const decorator of decorators) {
      decorator.apply(this.editor, element);
    }
  }

  /**
   * 渲染widget装饰器
   */
  renderWidget(editor: Editor, widgetDecorator: WidgetDecorator, widgetData?: any) {
    const widgetElement = widgetDecorator.render(editor, widgetData);
    return createWidgetWrapper(widgetElement, widgetDecorator);
  }

  /**
   * 清空所有装饰器
   */
  clear(): void {
    // 清理资源
    this.decorators.forEach((decorator) => {
      if (decorator.dispose) {
        decorator.dispose();
      }
    });

    this.widgetDecorators.forEach((decorator) => {
      if (decorator.dispose) {
        decorator.dispose();
      }
    });

    this.decorators.clear();
    this.decoratorsByPriority = [];
    this.widgetDecorators.clear();
    this.widgetDecoratorsByPriority = [];
  }

  /**
   * 更新优先级列表
   */
  private updatePriorityList(): void {
    this.decoratorsByPriority = Array.from(this.decorators.values()).sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 更新widget装饰器优先级列表
   */
  private updateWidgetPriorityList(): void {
    this.widgetDecoratorsByPriority = Array.from(this.widgetDecorators.values()).sort((a, b) => b.getPriority() - a.getPriority());
  }
}
