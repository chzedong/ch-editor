# 导航工具系统 (Navigation Utils)

本模块提供了一个可扩展的导航系统，支持在富文本编辑器中处理不同类型的元素导航，包括文本、空格、Box元素以及未来可能的中日韩字符、装饰器等。

## 核心功能

### 1. 元素类型识别

系统支持识别以下元素类型：

- **TEXT**: 普通文本字符
- **SPACE**: 空格字符
- **BOX**: Box元素（如mention、image等）
- **CJK**: 中日韩字符（可扩展）
- **DECORATOR**: 装饰器元素（可扩展）

### 2. 单词导航

提供了两个主要的导航函数：

- `editorGetPreWordStart(ops, offset)`: 获取前一个单词的起始位置
- `editorGetNextWordEnd(ops, offset, len)`: 获取下一个单词的结束位置

这些函数现在能够正确处理Box元素，将其视为单词分隔符。

## 使用示例

### 基本使用

```typescript
import { 
  editorGetPreWordStart, 
  editorGetNextWordEnd,
  getNavigationElementAt,
  NavigationElementType
} from './navigation-utils';

// 获取元素类型
const element = getNavigationElementAt(ops, offset);
if (element?.type === NavigationElementType.BOX) {
  console.log('这是一个Box元素:', element.data);
}

// 单词导航
const prevWordStart = editorGetPreWordStart(ops, currentOffset);
const nextWordEnd = editorGetNextWordEnd(ops, currentOffset, textLength);
```

### 扩展自定义识别器

系统支持注册自定义的元素识别器：

```typescript
import { 
  registerNavigationElementRecognizer,
  INavigationElementRecognizer,
  NavigationElementType
} from './navigation-utils';

// 创建自定义识别器
class CustomElementRecognizer implements INavigationElementRecognizer {
  priority = 70; // 设置优先级

  recognize(op: DocBlockTextOp, charIndex?: number): INavigationElement | null {
    // 实现自定义识别逻辑
    if (isCustomElement(op, charIndex)) {
      return {
        type: NavigationElementType.CJK, // 或其他类型
        length: 1,
        data: { /* 自定义数据 */ }
      };
    }
    return null;
  }
}

// 注册识别器
registerNavigationElementRecognizer(new CustomElementRecognizer());
```

## 内置扩展示例

### 中日韩字符识别器

```typescript
import { CJKElementRecognizer, registerNavigationElementRecognizer } from './navigation-utils';

// 注册中日韩字符识别器
registerNavigationElementRecognizer(new CJKElementRecognizer());
```

支持的字符范围：
- CJK统一汉字 (U+4E00-U+9FFF)
- CJK扩展A (U+3400-U+4DBF)
- CJK扩展B (U+20000-U+2A6DF)
- 平假名 (U+3040-U+309F)
- 片假名 (U+30A0-U+30FF)
- 韩文音节 (U+AC00-U+D7AF)

### 装饰器元素识别器

```typescript
import { DecoratorElementRecognizer, registerNavigationElementRecognizer } from './navigation-utils';

// 注册装饰器识别器
registerNavigationElementRecognizer(new DecoratorElementRecognizer());
```

支持的装饰器字符：
- 零宽空格 (U+200B)
- 零宽非连字符 (U+200C)
- 零宽连字符 (U+200D)
- 零宽非断空格 (U+FEFF)

## 架构设计

### 识别器优先级

识别器按优先级排序执行，优先级越高越先执行：

1. **BoxElementRecognizer** (优先级: 100)
2. **DecoratorElementRecognizer** (优先级: 80)
3. **CJKElementRecognizer** (优先级: 60)
4. **SpaceElementRecognizer** (优先级: 50)
5. **TextElementRecognizer** (优先级: 1)

### 扩展性考虑

- **插件化设计**: 通过识别器接口支持动态扩展
- **优先级机制**: 确保特殊元素优先于通用元素被识别
- **类型安全**: 使用TypeScript接口确保类型安全
- **向后兼容**: 新的识别器不会影响现有功能

## 测试

运行测试以验证功能：

```bash
npm test navigation-utils.test.ts
```

测试覆盖了：
- 基本元素类型识别
- 单词导航功能
- Box元素处理
- 自定义识别器扩展
- 混合内容导航

## 注意事项

1. **性能考虑**: 识别器按优先级顺序执行，高优先级的识别器应该尽可能高效
2. **字符索引**: 对于文本操作，需要正确处理字符索引以避免越界
3. **Box元素**: Box元素在文本中占用1个字符位置，但在DOM中可能有不同的表现
4. **Unicode支持**: 确保正确处理Unicode字符，特别是多字节字符

## 未来扩展

系统设计支持未来添加更多元素类型：

- **表情符号识别器**: 处理emoji和表情符号
- **数学公式识别器**: 处理LaTeX或MathML公式
- **链接识别器**: 处理URL和内部链接
- **标签识别器**: 处理hashtag和@mention
- **代码块识别器**: 处理内联代码和代码块

通过注册相应的识别器，可以轻松扩展系统功能而不影响现有代码。