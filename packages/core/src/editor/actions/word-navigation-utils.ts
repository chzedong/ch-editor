import { DocBlockText, DocBlockTextOp } from '../../index.type';
import { isBoxOp, isTextOp } from '../../box/box-data-model';

/**
 * 导航元素类型枚举
 * 用于识别文本中的不同元素类型，支持扩展
 */
export enum NavigationElementType {
  /** 普通文本字符 */
  TEXT = 'text',
  /** 空格字符 */
  SPACE = 'space',
  /** Box 元素 */
  BOX = 'box',
  /** 中日韩字符（未来扩展） */
  CJK = 'cjk',
  /** 装饰器元素（未来扩展） */
  DECORATOR = 'decorator'
}

/**
 * 导航元素信息接口
 */
interface NavigationElement {
  type: NavigationElementType;
  /** 元素在文本中的长度 */
  length: number;
  /** 元素的原始数据 */
  data?: any;
}

/**
 * 导航元素识别器接口
 * 支持插件化扩展不同类型的元素识别
 */
interface NavigationElementRecognizer {
  /** 识别器的优先级，数值越大优先级越高 */
  priority: number;
  /** 识别元素类型 */
  recognize(op: DocBlockTextOp, charIndex?: number): NavigationElement | null;
}

/**
 * 导航元素识别器管理类
 */
class NavigationElementRecognizers {
  private recognizers: NavigationElementRecognizer[] = [];

  constructor() {
    // 注册默认识别器
    this.registerRecognizer(new BoxElementRecognizer());
    this.registerRecognizer(new SpaceElementRecognizer());
    this.registerRecognizer(new TextElementRecognizer());
  }

  registerRecognizer(recognizer: NavigationElementRecognizer) {
    this.recognizers.push(recognizer);
    // 按优先级排序，优先级高的在前
    this.recognizers.sort((a, b) => b.priority - a.priority);
  }

  recognizeElement(op: DocBlockTextOp, charIndex?: number): NavigationElement {
    for (const recognizer of this.recognizers) {
      const result = recognizer.recognize(op, charIndex);
      if (result) {
        return result;
      }
    }
    // 默认返回文本元素
    return { type: NavigationElementType.TEXT, length: 1 };
  }
}

/**
 * Box 元素识别器
 */
class BoxElementRecognizer implements NavigationElementRecognizer {
  priority = 100;

  recognize(op: DocBlockTextOp): NavigationElement | null {
    if (isBoxOp(op)) {
      return {
        type: NavigationElementType.BOX,
        length: 1, // Box 在文本中占用1个字符位置
        data: op.attributes.insertBox
      };
    }
    return null;
  }
}

/**
 * 空格元素识别器
 */
class SpaceElementRecognizer implements NavigationElementRecognizer {
  priority = 50;

  recognize(op: DocBlockTextOp, charIndex: number = 0): NavigationElement | null {
    if (isTextOp(op) && charIndex < op.insert.length) {
      const char = op.insert[charIndex];
      if (char === ' ') {
        return {
          type: NavigationElementType.SPACE,
          length: 1
        };
      }
    }
    return null;
  }
}

/**
 * 文本元素识别器（默认识别器）
 */
class TextElementRecognizer implements NavigationElementRecognizer {
  priority = 1;

  recognize(op: DocBlockTextOp, charIndex: number = 0): NavigationElement | null {
    if (isTextOp(op) && charIndex < op.insert.length) {
      return {
        type: NavigationElementType.TEXT,
        length: 1
      };
    }
    return null;
  }
}

// 全局导航元素识别器实例
const navigationRecognizers = new NavigationElementRecognizers();

/**
 * 注册自定义导航元素识别器
 * 用于扩展支持新的元素类型（如中日韩字符、装饰器等）
 * @param recognizer 自定义识别器
 */
export function registerNavigationElementRecognizer(recognizer: NavigationElementRecognizer) {
  navigationRecognizers.registerRecognizer(recognizer);
}

/**
 * 导航元素识别器接口（导出供外部实现）
 */
export interface INavigationElementRecognizer extends NavigationElementRecognizer {}

/**
 * 导航元素信息接口（导出供外部使用）
 */
export interface INavigationElement extends NavigationElement {}

/**
 * 示例：中日韩字符识别器
 * 展示如何扩展支持新的元素类型
 * 使用方式：registerNavigationElementRecognizer(new CJKElementRecognizer());
 */
export class CJKElementRecognizer implements INavigationElementRecognizer {
  priority = 60; // 优先级介于空格和文本之间

  recognize(op: DocBlockTextOp, charIndex: number = 0): INavigationElement | null {
    if (isTextOp(op) && charIndex < op.insert.length) {
      const char = op.insert[charIndex];
      // 检查是否为中日韩字符（Unicode范围）
      const cjkRanges = [
        [0x4E00, 0x9FFF], // CJK统一汉字
        [0x3400, 0x4DBF], // CJK扩展A
        [0x20000, 0x2A6DF], // CJK扩展B
        [0x3040, 0x309F], // 平假名
        [0x30A0, 0x30FF], // 片假名
        [0xAC00, 0xD7AF] // 韩文音节
      ];

      const charCode = char.charCodeAt(0);
      const isCJK = cjkRanges.some(([start, end]) => charCode >= start && charCode <= end);

      if (isCJK) {
        return {
          type: NavigationElementType.CJK,
          length: 1
        };
      }
    }
    return null;
  }
}

/**
 * 示例：装饰器元素识别器
 * 展示如何识别特殊的装饰器元素
 * 使用方式：registerNavigationElementRecognizer(new DecoratorElementRecognizer());
 */
export class DecoratorElementRecognizer implements INavigationElementRecognizer {
  priority = 80; // 高优先级

  recognize(op: DocBlockTextOp, charIndex: number = 0): INavigationElement | null {
    if (isTextOp(op) && charIndex < op.insert.length) {
      const char = op.insert[charIndex];
      // 检查是否为装饰器字符（例如：零宽字符、特殊标记等）
      const decoratorChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']; // 零宽字符

      if (decoratorChars.includes(char)) {
        return {
          type: NavigationElementType.DECORATOR,
          length: 1,
          data: { char }
        };
      }
    }
    return null;
  }
}

/**
 * 获取指定偏移量位置的导航元素信息
 * @param ops 文本操作数组
 * @param offset 目标偏移量
 * @returns 导航元素信息，如果偏移量无效则返回null
 */
export function getNavigationElementAt(ops: DocBlockText, offset: number): NavigationElement | null {
  if (offset < 0) {
    return null;
  }

  let currentOffset = 0;

  for (const op of ops) {
    if (isBoxOp(op)) {
      if (currentOffset === offset) {
        return navigationRecognizers.recognizeElement(op);
      }
      currentOffset += 1;
    } else if (isTextOp(op)) {
      const opLength = op.insert.length;
      if (offset >= currentOffset && offset < currentOffset + opLength) {
        const charIndex = offset - currentOffset;
        return navigationRecognizers.recognizeElement(op, charIndex);
      }
      currentOffset += opLength;
    }

    if (currentOffset > offset) {
      break;
    }
  }

  return null;
}

/**
 * 判断两个导航元素是否为相同类型
 * @param element1 第一个元素
 * @param element2 第二个元素
 * @returns 是否为相同类型
 */
export function isSameElementType(element1: NavigationElement | null, element2: NavigationElement | null): boolean {
  if (!element1 || !element2) {
    return false;
  }
  return element1.type === element2.type;
}

/**
 * 查找前一个单词的起始偏移量
 * 支持处理空格、box等不同类型的元素
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @param currentElementType 当前位置的元素类型
 * @returns 前一个单词的起始偏移量，如果到达开头则返回0，如果当前就在分隔符上则返回-1
 */
function findPreWordOffset(ops: DocBlockText, offset: number, currentElementType: NavigationElementType): number {
  let isInSeparator = (currentElementType === NavigationElementType.SPACE || currentElementType === NavigationElementType.BOX);
  let currentOffset = offset;

  while (currentOffset > 0) {
    currentOffset--;
    const element = getNavigationElementAt(ops, currentOffset);

    if (!element) {
      break;
    }

    const isSeparator = (element.type === NavigationElementType.SPACE || element.type === NavigationElementType.BOX);

    // 如果当前在分隔符中，遇到非分隔符就返回当前位置的下一个位置
    if (isSeparator && !isInSeparator) {
      return currentOffset + 1;
    }

    // 如果遇到非分隔符，标记不再在分隔符中
    if (!isSeparator) {
      isInSeparator = false;
    }
  }

  // 如果到达开头且当前在分隔符中，返回-1表示无效
  // 否则返回0表示到达文档开头
  return isInSeparator ? -1 : 0;
}

/**
 * 获取前一个单词的起始位置
 * 支持处理空格、box等不同类型的元素
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @returns 前一个单词的起始偏移量
 */
export function editorGetPreWordStart(ops: DocBlockText, offset: number): number {
  if (ops.length === 0) {
    return 0;
  }

  if (offset <= 0) {
    return 0;
  }

  // 获取当前位置前一个字符的元素信息
  const preOffset = offset - 1;
  const currentElement = getNavigationElementAt(ops, preOffset);

  if (!currentElement) {
    return 0;
  }

  const result = findPreWordOffset(ops, preOffset, currentElement.type);
  return result === -1 ? 0 : result;
}

/**
 * 查找下一个单词的结束偏移量
 * 支持处理空格、box等不同类型的元素
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @param currentElementType 当前位置的元素类型
 * @param len 文本总长度
 * @returns 下一个单词的结束偏移量，如果到达末尾则返回总长度，如果当前就在分隔符上则返回-1
 */
function findNextWordEnd(ops: DocBlockText, offset: number, currentElementType: NavigationElementType, len: number): number {
  let isInSeparator = (currentElementType === NavigationElementType.SPACE || currentElementType === NavigationElementType.BOX);
  let currentOffset = offset;

  while (currentOffset < len) {
    const element = getNavigationElementAt(ops, currentOffset);

    if (!element) {
      break;
    }

    const isSeparator = (element.type === NavigationElementType.SPACE || element.type === NavigationElementType.BOX);

    // 如果当前在分隔符中，遇到非分隔符就返回当前位置
    if (isSeparator && !isInSeparator) {
      return currentOffset;
    }

    // 如果遇到非分隔符，标记不再在分隔符中
    if (!isSeparator) {
      isInSeparator = false;
    }

    currentOffset++;
  }

  // 如果到达末尾且当前在分隔符中，返回-1表示无效
  // 否则返回总长度表示到达文档末尾
  return isInSeparator ? -1 : len;
}

/**
 * 获取下一个单词的结束位置
 * 支持处理空格、box等不同类型的元素
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @param len 文本总长度
 * @returns 下一个单词的结束偏移量
 */
export function editorGetNextWordEnd(ops: DocBlockText, offset: number, len: number): number {
  if (ops.length === 0) {
    return 0;
  }

  if (offset >= len) {
    return len;
  }

  // 获取当前位置的元素信息
  const currentElement = getNavigationElementAt(ops, offset);

  if (!currentElement) {
    return len;
  }

  const result = findNextWordEnd(ops, offset, currentElement.type, len);
  return result === -1 ? len : result;
}
