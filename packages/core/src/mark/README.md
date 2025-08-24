# Mark插件系统

这是一个插件化的富文本样式管理系统，灵感来源于ProseMirror和TipTap的mark概念。

## 核心概念

### Mark
Mark是富文本中的内联样式标记，如加粗、斜体、颜色等。每个Mark都是一个独立的插件，可以动态注册到编辑器中。

### 特性
- **插件化**: 每种样式都是独立的插件，支持动态注册和注销
- **可组合**: 多个Mark可以组合使用，如同时应用加粗和斜体
- **可继承**: 基于现有Mark创建新的变体
- **优先级**: 支持Mark优先级，控制应用顺序
- **冲突检测**: 自动检测和处理Mark之间的冲突

## 基础用法

### 1. 使用内置Mark

```typescript
import { Editor, BoldMark, ItalicMark } from '@ch-editor/core';

const editor = new Editor(container, options);

// 内置Mark会自动注册，可以直接使用
const boldAttrs = editor.markManager.createMarkAttributes('bold');
const italicAttrs = editor.markManager.createMarkAttributes('italic');
```

### 2. 创建自定义Mark

```typescript
import { SimpleMark, ParameterizedMark } from '@ch-editor/core';

// 简单Mark示例
class HighlightMark extends SimpleMark {
  readonly name = 'highlight';
  readonly className = 'style-highlight';
  readonly attributeKey = 'highlight';

  constructor() {
    super({ priority: 5 });
  }
}

// 参数化Mark示例
class CustomColorMark extends ParameterizedMark {
  readonly name = 'customColor';
  readonly attributePrefix = 'custom-color-';

  constructor() {
    super({ priority: 5 });
  }

  apply(context) {
    if (!this.matches(context.key, context.value)) {
      return { applied: false };
    }

    const color = this.extractParameter(context.key);
    return {
      applied: true,
      styles: { color }
    };
  }
}

// 注册自定义Mark
editor.markManager.register(new HighlightMark());
editor.markManager.register(new CustomColorMark());
```

### 3. Mark组合

```typescript
import { extendMarkManager, PREDEFINED_COMBINATIONS } from '@ch-editor/core';

// 扩展MarkManager以支持组合功能
const extendedManager = extendMarkManager(editor.markManager);

// 注册预定义组合
PREDEFINED_COMBINATIONS.forEach(config => {
  extendedManager.registerComposition(config);
});

// 创建自定义组合
extendedManager.registerComposition({
  name: 'emphasis',
  marks: ['bold', 'italic', 'underline'],
  priority: 25
});
```

### 4. Mark继承

```typescript
// 基于现有Mark创建变体
extendedManager.registerInheritance({
  name: 'strongBold',
  baseMark: 'bold',
  overrides: {
    priority: 15
  },
  customApply: (context, baseResult) => {
    return {
      ...baseResult,
      classes: [...(baseResult.classes || []), 'style-strong']
    };
  }
});
```

## 内置Mark列表

| Mark名称 | 属性键 | CSS类名 | 描述 |
|---------|--------|---------|------|
| bold | `bold` | `style-bold` | 加粗 |
| italic | `italic` | `style-italic` | 斜体 |
| underline | `underline` | `style-underline` | 下划线 |
| strikethrough | `strike` | `style-strikethrough` | 删除线 |
| code | `code` | `style-code` | 代码 |
| superscript | `script: 'super'` | `style-superscript` | 上标 |
| subscript | `script: 'sub'` | `style-subscript` | 下标 |
| color | `style-color-{color}` | - | 文字颜色 |
| backgroundColor | `style-background-{color}` | - | 背景色 |
| fontSize | `style-size-{size}` | - | 字体大小 |
| link | `link-{url}` | `style-link` | 链接 |

## 高级功能

### 冲突处理

```typescript
// 设置互斥Mark
class SuperscriptMark extends SimpleMark {
  constructor() {
    super({ 
      excludes: ['subscript'] // 与下标互斥
    });
  }
}
```

### 自定义渲染

```typescript
class CustomMark extends BaseMark {
  apply(context) {
    return {
      applied: true,
      classes: ['custom-class'],
      dataAttributes: { 'custom-attr': 'value' },
      styles: { 'font-weight': 'bold' },
      attributes: { 'title': 'Custom Mark' }
    };
  }
}
```

### 验证参数

```typescript
class ValidatedMark extends ParameterizedMark {
  validate(params) {
    // 自定义验证逻辑
    return params && typeof params === 'string' && params.length > 0;
  }
}
```

## 最佳实践

1. **优先级设置**: 基础样式(10)，装饰样式(5)，特殊样式(15+)
2. **命名规范**: 使用描述性的名称，避免冲突
3. **组合使用**: 优先使用预定义组合，减少冲突
4. **性能考虑**: 避免在apply方法中进行复杂计算
5. **向后兼容**: 新Mark应该与现有系统兼容

## 扩展示例

查看 `packages/demo` 目录中的完整示例，了解如何在实际项目中使用Mark插件系统。