import { DocBlockText, DocBlockTextOp } from '../../index.type';
import { isBoxOp } from '../../box/box-op';
import { isTextOp } from '../../text/text-op';

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
  DECORATOR = 'decorator',
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
    this.registerRecognizer(new CJKElementRecognizer());
    this.registerRecognizer(new DecoratorElementRecognizer());
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

/**
 * 示例：中日韩字符识别器
 * 展示如何扩展支持新的元素类型
 * 使用方式：registerNavigationElementRecognizer(new CJKElementRecognizer());
 */
class CJKElementRecognizer implements NavigationElementRecognizer {
  priority = 60; // 优先级介于空格和文本之间

  recognize(op: DocBlockTextOp, charIndex: number = 0): NavigationElement | null {
    if (isTextOp(op) && charIndex < op.insert.length) {
      const char = op.insert[charIndex];
      // 检查是否为中日韩字符（Unicode范围）
      const cjkRanges = [
        [0x4e00, 0x9fff], // CJK统一汉字
        [0x3400, 0x4dbf], // CJK扩展A
        [0x20000, 0x2a6df], // CJK扩展B
        [0x3040, 0x309f], // 平假名
        [0x30a0, 0x30ff], // 片假名
        [0xac00, 0xd7af] // 韩文音节
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
class DecoratorElementRecognizer implements NavigationElementRecognizer {
  priority = 80; // 高优先级

  recognize(op: DocBlockTextOp, charIndex: number = 0): NavigationElement | null {
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

// 全局导航元素识别器实例
const navigationRecognizers = new NavigationElementRecognizers();

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
 * Box规则：强制隔断，当前在box时向前应该到box的开头
 * Space规则：作为分隔符，跳过连续的空格
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @param currentElement 当前位置的元素
 * @returns 前一个单词的起始偏移量，如果到达开头则返回0，如果当前就在分隔符上则返回-1
 */
function findPreWordOffset(ops: DocBlockText, offset: number, currentElement: NavigationElement): number {

  // CJK字符、装饰器、box被视为独立的单词，直接返回当前位置
  if ([NavigationElementType.CJK, NavigationElementType.DECORATOR, NavigationElementType.BOX].includes(currentElement.type)) {
    return offset;
  }

  let currentOffset = offset;

  // 如果当前在空格上，先跳过所有连续的空格
  if (currentElement.type === NavigationElementType.SPACE) {
    while (currentOffset > 0) {
      currentOffset--;
      const element = getNavigationElementAt(ops, currentOffset);
      if (!element || element.type !== NavigationElementType.SPACE) {
        if (element) {
          currentOffset++; // 回到非空格元素的下一个位置
        }
        break;
      }
    }

    if (currentOffset === 0) {
      return 0;
    }

    // 现在处理非空格元素
    const element = getNavigationElementAt(ops, currentOffset - 1);
    if (!element) {
      return currentOffset;
    }

    // 如果是BOX、CJK或装饰器，返回其位置
    if ([NavigationElementType.BOX, NavigationElementType.CJK, NavigationElementType.DECORATOR].includes(element.type)) {
      return currentOffset - element.length;
    }

    // 如果是普通文本，继续向前查找单词边界
    currentElement = element;
    currentOffset--;
  }

  // 处理普通文本的单词边界
  while (currentOffset > 0) {
    currentOffset--;
    const element = getNavigationElementAt(ops, currentOffset);
    if (!element) {
      break;
    }

    // 如果元素类型发生变化（都是文本类型），也认为是单词边界
    if (currentElement.type !== element.type) {
      return currentOffset + 1;
    }
  }

  return 0;
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

  const result = findPreWordOffset(ops, preOffset, currentElement);
  return result === -1 ? 0 : result;
}

/**
 * 查找下一个单词的结束偏移量
 * 支持处理空格、box等不同类型的元素
 * Box规则：强制隔断，当前在box时向后应该到box的结尾
 * Space规则：作为分隔符，跳过连续的空格
 * @param ops 文本操作数组
 * @param offset 当前偏移量
 * @param currentElement 当前位置的元素
 * @param len 文本总长度
 * @returns 下一个单词的结束偏移量，如果到达末尾则返回总长度，如果当前就在分隔符上则返回-1
 */
function findNextWordEnd(ops: DocBlockText, offset: number, currentElement: NavigationElement, len: number): number {
  // CJK字符、box、装饰器被视为独立的单词，直接返回下一个位置
  if ([NavigationElementType.CJK, NavigationElementType.DECORATOR, NavigationElementType.BOX].includes(currentElement.type)) {
    return offset + currentElement.length;
  }

  let currentOffset = offset;

  // 如果当前在空格上，先跳过所有连续的空格
  if (currentElement.type === NavigationElementType.SPACE) {
    while (currentOffset < len) {
      const element = getNavigationElementAt(ops, currentOffset);
      if (!element || element.type !== NavigationElementType.SPACE) {
        break;
      }
      currentOffset++;
    }

    if (currentOffset >= len) {
      return len;
    }

    // 现在处理非空格元素
    const element = getNavigationElementAt(ops, currentOffset);
    if (!element) {
      return currentOffset;
    }

    if ([NavigationElementType.BOX, NavigationElementType.CJK, NavigationElementType.DECORATOR].includes(element.type)) {
      return currentOffset + element.length;
    }

    // 如果是普通文本，继续向后查找单词边界
    currentElement = element;
    currentOffset++;
  }

  // 处理普通文本的单词边界
  while (currentOffset < len) {
    const element = getNavigationElementAt(ops, currentOffset);

    if (!element) {
      break;
    }

    // 如果元素类型发生变化（都是文本类型），也认为是单词边界
    if (currentElement.type !== element.type) {
      return currentOffset;
    }

    currentElement = element;
    currentOffset++;
  }

  return len;
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

  const result = findNextWordEnd(ops, offset, currentElement, len);
  return result === -1 ? len : result;
}
