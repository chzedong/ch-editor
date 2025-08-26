# Word Navigation Utils

这个模块提供了强大的单词导航功能，支持处理文本、空格、Box元素以及未来的中日韩字符和装饰器元素。

## 核心功能

### 导航元素类型识别

支持以下元素类型：
- `TEXT`: 普通文本字符
- `SPACE`: 空格字符
- `BOX`: Box 元素
- `CJK`: 中日韩字符（扩展支持）
- `DECORATOR`: 装饰器元素（扩展支持）

### 单词导航函数

- `editorGetPreWordStart(ops, offset)`: 获取前一个单词的起始位置
- `editorGetNextWordEnd(ops, offset, len)`: 获取下一个单词的结束位置

### 元素识别函数

- `getNavigationElementAt(ops, offset)`: 获取指定位置的导航元素信息
- `isSameElementType(element1, element2)`: 判断两个元素是否为相同类型

## 扩展性设计

### 自定义识别器

可以通过实现 `INavigationElementRecognizer` 接口来添加自定义元素识别器：

```typescript
import { registerNavigationElementRecognizer, INavigationElementRecognizer } from './word-navigation-utils';

class CustomElementRecognizer implements INavigationElementRecognizer {
  priority = 70; // 设置优先级

  recognize(op: DocBlockTextOp, charIndex?: number): INavigationElement | null {
    // 实现自定义识别逻辑
    return null;
  }
}

// 注册自定义识别器
registerNavigationElementRecognizer(new CustomElementRecognizer());
```

### 内置扩展示例

#### 中日韩字符识别器

```typescript
import { CJKElementRecognizer, registerNavigationElementRecognizer } from './word-navigation-utils';

// 注册中日韩字符识别器
registerNavigationElementRecognizer(new CJKElementRecognizer());
```

#### 装饰器元素识别器

```typescript
import { DecoratorElementRecognizer, registerNavigationElementRecognizer } from './word-navigation-utils';

// 注册装饰器元素识别器
registerNavigationElementRecognizer(new DecoratorElementRecognizer());
```

## 使用示例

### 基本单词导航

```typescript
import { editorGetPreWordStart, editorGetNextWordEnd } from './word-navigation-utils';

const ops = [
  { insert: 'hello world test' }
];

// 从位置12（'test'的't'）向前查找单词起始位置
const preWordStart = editorGetPreWordStart(ops, 12); // 返回 6（'world'的起始位置）

// 从位置0（'hello'的'h'）向后查找单词结束位置
const nextWordEnd = editorGetNextWordEnd(ops, 0, 16); // 返回 5（'hello'的结束位置）
```

### 处理Box元素

```typescript
import { createBoxInsertOp } from '../../box/box-data-model';
import { editorGetPreWordStart } from './word-navigation-utils';

const ops = [
  { insert: 'hello ' },
  createBoxInsertOp({ type: 'mention', id: '1', data: { name: 'user' } }),
  { insert: ' world' }
];

// Box元素会被正确识别为单词分隔符
const preWordStart = editorGetPreWordStart(ops, 10); // 正确处理Box元素
```

### 元素类型检查

```typescript
import { getNavigationElementAt, NavigationElementType } from './word-navigation-utils';

const ops = [
  { insert: 'hello world' }
];

const element = getNavigationElementAt(ops, 5); // 空格位置
if (element?.type === NavigationElementType.SPACE) {
  console.log('这是一个空格字符');
}
```

## 架构设计

### 识别器优先级

识别器按优先级排序执行，优先级越高越先执行：
- Box识别器: 100
- 装饰器识别器: 80
- 中日韩识别器: 60
- 空格识别器: 50
- 文本识别器: 1（默认）

### 插件化设计

通过 `NavigationElementRecognizers` 类管理所有识别器，支持动态注册新的识别器，实现了良好的扩展性。

## 测试

运行测试：
```bash
npm test word-navigation-utils.test.ts
```

测试覆盖了：
- 基本元素类型识别
- 单词导航功能
- Box元素处理
- 自定义识别器扩展

## 未来扩展

这个架构设计支持未来添加更多元素类型：
- 更复杂的中日韩字符处理
- 特殊标点符号识别
- 数学公式元素
- 表情符号处理
- 其他自定义元素类型