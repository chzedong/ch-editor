import { BoxData } from '../index.type';

/**
 * Box DOM 属性常量
 */
export const BOX_DOM_ATTRIBUTES = {
  BOX_ID: 'data-box-id',
  BOX_TYPE: 'data-box-type',
  BOX_CONTENT: 'data-box-content',
  BOX_BREAKABLE: 'data-box-breakable'
} as const;

/**
 * Box DOM 工具类
 */
export class BoxDomUtils {
  /**
   * 创建 box 的包装元素
   * @param boxData box 数据
   * @param content box 内容元素
   * @param canWrap 是否可以跨行
   */
  static createBoxWrapper(boxData: BoxData, content: HTMLElement, canWrap: boolean = false): HTMLElement {
    const wrapper = document.createElement('span');

    // 设置基本属性
    wrapper.setAttribute(BOX_DOM_ATTRIBUTES.BOX_ID, boxData.id);
    wrapper.setAttribute(BOX_DOM_ATTRIBUTES.BOX_TYPE, boxData.type);
    wrapper.setAttribute(BOX_DOM_ATTRIBUTES.BOX_BREAKABLE, canWrap.toString());

    // 设置内容
    content.setAttribute(BOX_DOM_ATTRIBUTES.BOX_CONTENT, 'true');
    wrapper.appendChild(content);
    return wrapper;
  }

  /**
   * 检查元素是否为 box 包装器
   * @param element DOM 元素
   */
  static isBoxWrapper(element: Element): boolean {
    return element.hasAttribute(BOX_DOM_ATTRIBUTES.BOX_ID);
  }

  /**
   * 检查元素是否为 box 内容
   * @param element DOM 元素
   */
  static isBoxContent(element: Element): boolean {
    return element.hasAttribute(BOX_DOM_ATTRIBUTES.BOX_CONTENT);
  }

  /**
   * 获取 box 的 ID
   * @param boxElement box 包装器元素
   */
  static getBoxId(boxElement: Element): string | null {
    return boxElement.getAttribute(BOX_DOM_ATTRIBUTES.BOX_ID);
  }

  /**
   * 获取 box 的类型
   * @param boxElement box 包装器元素
   */
  static getBoxType(boxElement: Element): string | null {
    return boxElement.getAttribute(BOX_DOM_ATTRIBUTES.BOX_TYPE);
  }

  /**
   * 检查 box 是否可以跨行
   * @param boxElement box 包装器元素
   */
  static canBoxWrap(boxElement: Element): boolean {
    const breakable = boxElement.getAttribute(BOX_DOM_ATTRIBUTES.BOX_BREAKABLE);
    return breakable === 'true';
  }

  /**
   * 获取 box 的内容元素
   * @param boxElement box 包装器元素
   */
  static getBoxContent(boxElement: Element): Element | null {
    return boxElement.querySelector(`[${BOX_DOM_ATTRIBUTES.BOX_CONTENT}]`);
  }
}
