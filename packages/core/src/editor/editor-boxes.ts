import '../styles/box.css';
import { BoxData } from '../index.type';
import { assert } from '../main';
import { MentionBox } from '../extensions/boxes/mention-box';

/**
 * Box 构造函数接口
 */
export interface BoxConstructor {
  new (type: string): BoxInstance;
}

/**
 * Box 实例接口
 */
export interface BoxInstance {
  readonly type: string;

  /**
   * 渲染 box 的 DOM 元素
   */
  render(data: BoxData): HTMLElement;

  /**
   * 销毁 box 实例
   */
  destroy(): void;

  /**
   * 是否可以跨行显示
   */
  canWrap(): boolean;
}

/**
 * Box 管理器，负责注册、创建和管理 box 实例
 * 专注于插件管理和渲染，不处理数据操作
 */
export class EditorBoxes {
  private _boxInstances = new Map<string, BoxInstance>();

  constructor() {
    this._initializeDefaultBoxes();
  }

  /**
   * 初始化默认的 box 类型
   */
  private _initializeDefaultBoxes(): void {
    // 注册默认的 box 类型
    this.registerBoxClass('mention', MentionBox);
  }

  /**
   * 注册 box 类
   * @param type box 类型
   * @param boxClass box 构造函数
   */
  registerBoxClass(type: string, boxClass: BoxConstructor): void {
    this._boxInstances.set(type, new boxClass(type));
  }

  /**
   * 获取 box 类
   * @param type box 类型
   */
  getBoxClass(type: string): BoxInstance | undefined {
    return this._boxInstances.get(type);
  }

  /**
   * 检查是否存在指定类型的 box
   * @param type box 类型
   */
  hasBox(type: string): boolean {
    return this._boxInstances.has(type);
  }

  /**
   * 销毁 box 实例
   * @param id box ID
   */
  destroyBoxInstance(id: string): void {
    const instance = this._boxInstances.get(id);
    if (instance) {
      instance.destroy();
      this._boxInstances.delete(id);
    }
  }

  /**
   * 检查 box 类型是否支持跨行
   * @param type box 类型
   */
  canBoxWrap(type: string): boolean {
    const instance = this._boxInstances.get(type);
    return instance?.canWrap() ?? false;
  }

  /**
   * 渲染 box
   * @param data box 数据
   */
  renderBox(data: BoxData): { boxContent: HTMLElement; canWrap: boolean } {
    const instance = this._boxInstances.get(data.type);
    assert(instance, `Box type ${data.type} not registered`);

    const boxContent = instance.render(data);
    return { boxContent, canWrap: instance.canWrap() };
  }

}
