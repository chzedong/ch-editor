// 基础装饰器类和接口
export {
  BaseDecorator,
  WidgetDecorator,
  type DecoratorRenderContext,
  type DecoratorRange,
  type DecoratorOptions,
  type WidgetRenderContext,
  type WidgetRange
} from './base-decorator';

// 装饰器管理器
export { DecoratorManager } from './decorator-manager';

// 内置装饰器实现
export * from './built-in-decorators';
export { getBuiltInDecorators } from './built-in-decorators';

export * from './widget-decorators';


// 装饰器样式
import './decorator-styles.css';
import './widget-styles.css';
