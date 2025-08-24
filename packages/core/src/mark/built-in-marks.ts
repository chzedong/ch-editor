import { SimpleMark, ParameterizedMark, MarkRenderContext, MarkApplyResult } from './base-mark';
import AttributeMap from 'quill-delta/dist/AttributeMap';

/**
 * 加粗Mark
 */
export class BoldMark extends SimpleMark {
  readonly name = 'bold';
  readonly className = 'style-bold';
  readonly attributeKey = 'bold';

  constructor() {
    super({ priority: 10 });
  }
}

/**
 * 斜体Mark
 */
export class ItalicMark extends SimpleMark {
  readonly name = 'italic';
  readonly className = 'style-italic';
  readonly attributeKey = 'italic';

  constructor() {
    super({ priority: 10 });
  }
}

/**
 * 下划线Mark
 */
export class UnderlineMark extends SimpleMark {
  readonly name = 'underline';
  readonly className = 'style-underline';
  readonly attributeKey = 'underline';

  constructor() {
    super({ priority: 10 });
  }
}

/**
 * 删除线Mark
 */
export class StrikethroughMark extends SimpleMark {
  readonly name = 'strikethrough';
  readonly className = 'style-strikethrough';
  readonly attributeKey = 'strike';

  constructor() {
    super({ priority: 10 });
  }
}

/**
 * 代码Mark
 */
export class CodeMark extends SimpleMark {
  readonly name = 'code';
  readonly className = 'style-code';
  readonly attributeKey = 'code';

  constructor() {
    super({ priority: 15 });
  }
}

/**
 * 上标Mark
 */
export class SuperscriptMark extends SimpleMark {
  readonly name = 'superscript';
  readonly className = 'style-superscript';
  readonly attributeKey = 'script';

  constructor() {
    super({
      priority: 20,
      excludes: ['subscript']
    });
  }

  matches(key: string, value: any): boolean {
    return key === 'script' && value === 'super';
  }

  createAttributes(): AttributeMap {
    return { script: 'super' };
  }
}

/**
 * 下标Mark
 */
export class SubscriptMark extends SimpleMark {
  readonly name = 'subscript';
  readonly className = 'style-subscript';
  readonly attributeKey = 'script';

  constructor() {
    super({
      priority: 20,
      excludes: ['superscript']
    });
  }

  matches(key: string, value: any): boolean {
    return key === 'script' && value === 'sub';
  }

  createAttributes(): AttributeMap {
    return { script: 'sub' };
  }
}

/**
 * 颜色Mark
 */
export class ColorMark extends ParameterizedMark {
  readonly name = 'color';
  readonly attributePrefix = 'style-color-';

  constructor() {
    super({ priority: 5 });
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    const color = this.extractParameter(context.key);

    return {
      applied: true,
      dataAttributes: {
        'style-color': color
      }
    };
  }

  validate(color?: string): boolean {
    if (!color) return false;

    // 验证颜色格式（简单验证）
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+).*$/;
    return colorRegex.test(color);
  }
}

/**
 * 背景色Mark
 */
export class BackgroundColorMark extends ParameterizedMark {
  readonly name = 'backgroundColor';
  readonly attributePrefix = 'style-background-';

  constructor() {
    super({ priority: 5 });
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    const color = this.extractParameter(context.key);

    return {
      applied: true,
      dataAttributes: {
        'style-background': color
      }
    };
  }

  validate(color?: string): boolean {
    if (!color) return false;

    // 验证颜色格式（简单验证）
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+).*$/;
    return colorRegex.test(color);
  }
}

/**
 * 字体大小Mark
 */
export class FontSizeMark extends ParameterizedMark {
  readonly name = 'fontSize';
  readonly attributePrefix = 'style-size-';

  constructor() {
    super({ priority: 5 });
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    const size = this.extractParameter(context.key);

    return {
      applied: true,
      dataAttributes: {
        'style-size': size
      }
    };
  }

  validate(size?: string): boolean {
    if (!size) return false;

    // 验证字体大小格式
    const sizeRegex = /^(\d+(\.\d+)?(px|em|rem|%|pt)|small|medium|large|x-large|xx-large)$/;
    return sizeRegex.test(size);
  }
}

/**
 * 链接Mark
 */
export class LinkMark extends ParameterizedMark {
  readonly name = 'link';
  readonly attributePrefix = 'link-';

  constructor() {
    super({ priority: 30 });
  }

  apply(context: MarkRenderContext): MarkApplyResult {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    const url = this.extractParameter(context.key);

    return {
      applied: true,
      classes: ['style-link'],
      attributes: {
        'data-link-url': url
      }
    };
  }

  validate(url?: string): boolean {
    if (!url) return false;

    try {
      new URL(url);
      return true;
    } catch {
      // 也允许相对路径
      return /^(\/|\.\/|\.\.\/|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(url);
    }
  }
}

/**
 * 获取所有内置Mark
 */
export function getBuiltInMarks() {
  return [
    new BoldMark(),
    new ItalicMark(),
    new UnderlineMark(),
    new StrikethroughMark(),
    new CodeMark(),
    new SuperscriptMark(),
    new SubscriptMark(),
    new ColorMark(),
    new BackgroundColorMark(),
    new FontSizeMark(),
    new LinkMark()
  ];
}
