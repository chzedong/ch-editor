import { Editor } from '../editor/editor';
import { TextBlockContentChild } from '../index.type';
import { BaseDecorator, DecoratorRange } from './base-decorator';

/**
 * 装饰器管理器
 */
export class DecoratorManager {
  private decorators = new Map<string, BaseDecorator>();
  private decoratorsByPriority: BaseDecorator[] = [];

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
   * 清空所有装饰器
   */
  clear(): void {
    // 清理资源
    this.decorators.forEach((decorator) => {
      if (decorator.dispose) {
        decorator.dispose();
      }
    });

    this.decorators.clear();
    this.decoratorsByPriority = [];
  }

  /**
   * 更新优先级列表
   */
  private updatePriorityList(): void {
    this.decoratorsByPriority = Array.from(this.decorators.values()).sort((a, b) => b.getPriority() - a.getPriority());
  }
}
