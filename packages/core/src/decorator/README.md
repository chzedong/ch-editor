# 装饰器系统 (Decorator System)

装饰器系统是编辑器的一个核心功能，允许通过插件的方式将运行时状态集成到编辑器的渲染管线中。装饰器可以动态地为文本内容添加样式、类名、数据属性等视觉效果，用于表示临时状态，如选区高亮、搜索结果、错误标记、协作光标等。

## 核心概念

### 装饰器 (Decorator)

装饰器是一个可插拔的组件，负责：
- 检测是否应该应用装饰效果
- 计算装饰范围
- 将装饰效果应用到DOM元素

### 装饰器管理器 (DecoratorManager)

装饰器管理器负责：
- 装饰器的注册和管理
- 计算所有装饰器的范围
- 处理装饰器冲突
- 应用装饰器到DOM元素

### 文本分割器 (TextSplitter)

文本分割器负责：
- 根据装饰器范围分割文本操作
- 处理装饰器与持久化数据的交叉选区
- 生成最小的渲染单元

## 装饰器类型

### 1. BaseDecorator (基础装饰器)

所有装饰器的抽象基类，定义了装饰器的基本接口。

```typescript
abstract class BaseDecorator {
  abstract matches(context: DecoratorRenderContext): boolean;
  abstract calculateRanges(context: DecoratorRenderContext): DecoratorRange[];
  abstract apply(element: HTMLElement, context: any): DecoratorApplyResult;
}
```

### 2. SimpleDecorator (简单装饰器)

基于简单条件的装饰器，适用于基于文本内容或编辑器状态的装饰。

```typescript
abstract class SimpleDecorator extends BaseDecorator {
  // 提供了基础的启用/禁用、优先级管理等功能
}
```

### 3. SelectionDecorator (选区装饰器)

基于选区状态的装饰器，适用于需要根据用户选择或光标位置进行装饰的场景。

```typescript
abstract class SelectionDecorator extends BaseDecorator {
  // 提供了选区相关的辅助方法
}
```

## 内置装饰器

### 1. SelectionHighlightDecorator (选区高亮装饰器)

高亮当前选中的文本。

```typescript
const selectionDecorator = editor.decoratorManager.getDecorator('selection-highlight');
selectionDecorator.setEnabled(true);
```

### 2. SearchHighlightDecorator (搜索高亮装饰器)

高亮搜索匹配的文本。

```typescript
const searchDecorator = editor.decoratorManager.getDecorator('search-highlight');
searchDecorator.setEnabled(true);
searchDecorator.setSearchQuery('example');
searchDecorator.setCaseSensitive(false);
```

### 3. CurrentLineHighlightDecorator (当前行高亮装饰器)

高亮当前光标所在的行。

```typescript
const lineDecorator = editor.decoratorManager.getDecorator('current-line-highlight');
lineDecorator.setEnabled(true);
```

### 4. ErrorHighlightDecorator (错误高亮装饰器)

高亮拼写或语法错误的文本。

```typescript
const errorDecorator = editor.decoratorManager.getDecorator('error-highlight');
errorDecorator.setEnabled(true);
errorDecorator.addErrorRange({
  start: 10,
  end: 20,
  type: 'spelling',
  message: 'Spelling error detected'
});
```

### 5. CollaborativeCursorDecorator (协作光标装饰器)

显示其他用户的光标位置。

```typescript
const cursorDecorator = editor.decoratorManager.getDecorator('collaborative-cursor');
cursorDecorator.setEnabled(true);
cursorDecorator.addUserCursor({
  userId: 'user-123',
  position: 15,
  color: '#ff6b6b',
  name: 'Alice'
});
```

## 使用指南

### 1. 使用内置装饰器

```typescript
// 获取装饰器实例
const searchDecorator = editor.decoratorManager.getDecorator('search-highlight');

// 启用装饰器
searchDecorator.setEnabled(true);

// 配置装饰器
searchDecorator.setSearchQuery('keyword');
searchDecorator.setCaseSensitive(true);
```

### 2. 创建自定义装饰器

#### 简单装饰器示例

```typescript
class HighlightKeywordDecorator extends SimpleDecorator {
  private keyword: string = '';

  constructor() {
    super('highlight-keyword', 100);
  }

  setKeyword(keyword: string) {
    this.keyword = keyword;
    this.notifyChange(); // 通知装饰器管理器重新渲染
  }

  matches(context: DecoratorRenderContext): boolean {
    return this.isEnabled() && this.keyword.length > 0;
  }

  calculateRanges(context: DecoratorRenderContext) {
    const ranges = [];
    const text = this.getBlockText(context.blockText);
    let index = 0;

    while (index < text.length) {
      const found = text.indexOf(this.keyword, index);
      if (found === -1) break;

      ranges.push({
        start: found,
        end: found + this.keyword.length,
        decorator: this,
        data: { keyword: this.keyword }
      });

      index = found + 1;
    }

    return ranges;
  }

  apply(element: HTMLElement, context: any) {
    element.classList.add('keyword-highlight');
    element.style.backgroundColor = '#fff3cd';
    element.style.border = '1px solid #ffeaa7';
    element.style.borderRadius = '2px';
    
    return {
      success: true,
      appliedClasses: ['keyword-highlight'],
      appliedStyles: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '2px'
      }
    };
  }
}
```

#### 选区装饰器示例

```typescript
class CommentDecorator extends SelectionDecorator {
  private comments: Map<string, { start: number; end: number; comment: string }> = new Map();

  constructor() {
    super('comment-decorator', 90);
  }

  addComment(id: string, start: number, end: number, comment: string) {
    this.comments.set(id, { start, end, comment });
    this.notifyChange();
  }

  removeComment(id: string) {
    this.comments.delete(id);
    this.notifyChange();
  }

  matches(context: DecoratorRenderContext): boolean {
    return this.isEnabled() && this.comments.size > 0;
  }

  calculateRanges(context: DecoratorRenderContext) {
    const ranges = [];

    for (const [id, comment] of this.comments) {
      ranges.push({
        start: comment.start,
        end: comment.end,
        decorator: this,
        data: { commentId: id, comment: comment.comment }
      });
    }

    return ranges;
  }

  apply(element: HTMLElement, context: any) {
    const commentData = context.decoratorData?.get(this.name);
    
    element.classList.add('comment-highlight');
    element.style.backgroundColor = '#e3f2fd';
    element.style.borderBottom = '2px dotted #2196f3';
    element.style.cursor = 'help';
    element.title = commentData?.comment || '';

    return {
      success: true,
      appliedClasses: ['comment-highlight'],
      appliedStyles: {
        backgroundColor: '#e3f2fd',
        borderBottom: '2px dotted #2196f3',
        cursor: 'help'
      },
      appliedAttributes: {
        'title': commentData?.comment || ''
      }
    };
  }
}
```

### 3. 注册和管理装饰器

```typescript
// 创建装饰器实例
const keywordDecorator = new HighlightKeywordDecorator();
const commentDecorator = new CommentDecorator();

// 注册装饰器
editor.decoratorManager.register(keywordDecorator);
editor.decoratorManager.register(commentDecorator);

// 启用装饰器
keywordDecorator.setEnabled(true);
keywordDecorator.setKeyword('important');

commentDecorator.setEnabled(true);
commentDecorator.addComment('comment-1', 5, 15, 'This needs review');

// 获取所有装饰器
const allDecorators = editor.decoratorManager.getAllDecorators();

// 注销装饰器
editor.decoratorManager.unregister('highlight-keyword');

// 清除所有装饰器
editor.decoratorManager.clear();
```

### 4. 装饰器冲突处理

装饰器系统支持冲突检测和解决：

```typescript
class RedHighlightDecorator extends SimpleDecorator {
  constructor() {
    super('red-highlight', 100); // 高优先级
    this.setExcludes(['blue-highlight']); // 与蓝色高亮互斥
  }
  // ...
}

class BlueHighlightDecorator extends SimpleDecorator {
  constructor() {
    super('blue-highlight', 80); // 低优先级
    this.setExcludes(['red-highlight']); // 与红色高亮互斥
  }
  // ...
}
```

当两个互斥的装饰器应用到同一区域时，优先级高的装饰器会被应用。

### 5. 事件监听

```typescript
// 监听装饰器变化
editor.decoratorManager.on('decorator-changed', (decoratorName: string) => {
  console.log(`Decorator ${decoratorName} has changed`);
});

// 监听装饰器注册
editor.decoratorManager.on('decorator-registered', (decorator: BaseDecorator) => {
  console.log(`Decorator ${decorator.name} has been registered`);
});

// 监听装饰器注销
editor.decoratorManager.on('decorator-unregistered', (decoratorName: string) => {
  console.log(`Decorator ${decoratorName} has been unregistered`);
});
```

## 渲染流程

1. **计算装饰器范围**: `DecoratorManager.calculateDecoratorRanges()` 遍历所有启用的装饰器，计算它们的应用范围。

2. **文本分割**: `TextSplitter.splitTextOps()` 根据装饰器范围将文本操作分割成最小的渲染单元。

3. **渲染片段**: 对每个文本片段，先应用Mark系统的样式，再应用装饰器的效果。

4. **冲突解决**: 在重叠区域，根据优先级和互斥规则决定应用哪些装饰器。

## 性能优化

### 1. 延迟计算

装饰器范围只在需要渲染时才计算，避免不必要的计算开销。

### 2. 增量更新

当装饰器状态改变时，只重新渲染受影响的块，而不是整个文档。

### 3. 缓存机制

装饰器管理器可以缓存计算结果，避免重复计算相同的范围。

### 4. 批量操作

支持批量注册/注销装饰器，减少重复的渲染操作。

## 样式定制

装饰器系统提供了默认样式，可以通过CSS进行定制：

```css
/* 选区高亮 */
.ch-selection-highlight {
  background-color: rgba(0, 123, 255, 0.25);
}

/* 搜索高亮 */
.ch-search-highlight {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
}

/* 错误高亮 */
.ch-error-highlight {
  border-bottom: 2px wavy #dc3545;
}

/* 协作光标 */
.ch-collaborative-cursor {
  position: relative;
}

.ch-collaborative-cursor::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--cursor-color);
}
```

## 最佳实践

### 1. 装饰器命名

使用描述性的名称，避免冲突：

```typescript
// 好的命名
'search-highlight'
'selection-highlight'
'error-spelling'
'comment-annotation'

// 避免的命名
'highlight'
'decorator1'
'temp'
```

### 2. 优先级设置

合理设置优先级，确保重要的装饰器能够正确显示：

```typescript
// 系统级装饰器：高优先级 (90-100)
const selectionDecorator = new SelectionHighlightDecorator(); // 95
const errorDecorator = new ErrorHighlightDecorator(); // 90

// 功能级装饰器：中优先级 (50-89)
const searchDecorator = new SearchHighlightDecorator(); // 80
const commentDecorator = new CommentDecorator(); // 70

// 装饰性装饰器：低优先级 (10-49)
const keywordDecorator = new HighlightKeywordDecorator(); // 30
```

### 3. 性能考虑

- 避免在 `calculateRanges` 中进行复杂的计算
- 使用防抖机制处理频繁的状态变化
- 合理设置装饰器的启用条件

### 4. 错误处理

```typescript
apply(element: HTMLElement, context: any) {
  try {
    // 装饰器逻辑
    element.classList.add('my-decorator');
    
    return {
      success: true,
      appliedClasses: ['my-decorator']
    };
  } catch (error) {
    console.error('Decorator apply failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## 调试和测试

### 1. 调试工具

```typescript
// 获取装饰器状态
console.log('All decorators:', editor.decoratorManager.getAllDecorators());
console.log('Enabled decorators:', editor.decoratorManager.getAllDecorators().filter(d => d.isEnabled()));

// 查看装饰器范围
const ranges = editor.decoratorManager.calculateDecoratorRanges(context);
console.log('Decorator ranges:', ranges);

// 查看文本分割结果
const segments = TextSplitter.splitTextOps(blockText, ranges);
console.log('Text segments:', segments);
```

### 2. 单元测试

参考 `tests/decorator.test.ts` 中的测试用例，为自定义装饰器编写测试：

```typescript
describe('CustomDecorator', () => {
  let decorator: CustomDecorator;
  
  beforeEach(() => {
    decorator = new CustomDecorator();
  });

  it('should calculate ranges correctly', () => {
    decorator.setEnabled(true);
    // 测试逻辑
  });

  it('should apply styles correctly', () => {
    const element = document.createElement('span');
    const result = decorator.apply(element, context);
    expect(result.success).toBe(true);
  });
});
```

## 扩展和集成

装饰器系统设计为可扩展的，可以与其他编辑器功能集成：

- **语法高亮**: 创建基于语法分析的装饰器
- **拼写检查**: 集成拼写检查服务
- **协作编辑**: 显示其他用户的操作状态
- **版本控制**: 显示文档变更历史
- **AI辅助**: 显示AI建议和标注

通过装饰器系统，可以轻松地为编辑器添加各种视觉效果和交互功能，而不需要修改核心渲染逻辑。