# Word Navigation Utils

这个模块提供了强大的单词导航功能，支持处理文本、空格、Box元素以及未来的中日韩字符和装饰器元素。

## 核心功能

### 导航元素类型识别

支持以下元素类型：
- `TEXT`: 普通文本字符
- `SPACE`: 空格字符（作为分隔符，跳过连续空格）
- `BOX`: Box 元素（强制隔断，当前在box时向前/向后到box开头/结尾）
- `CJK`: 中日韩字符（扩展支持）
- `DECORATOR`: 装饰器元素（扩展支持）

#### Box 和 Space 的处理规则差异

**Box 规则（强制隔断）：**
- Box 元素强制作为单词边界，无论前后是否有空格
- 当光标在 Box 上时：
  - 向前导航：直接到 Box 的开头位置
  - 向后导航：直接到 Box 的结尾位置
- 遇到 Box 时立即停止，不会跳过

**Space 规则（分隔符）：**
- 空格作为单词分隔符，会跳过连续的多个空格
- 当光标在空格上时，会寻找下一个非空格字符
- 连续的空格被视为一个分隔区域

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
import { editorGetPreWordStart, editorGetNextWordEnd } from './word-navigation-utils';

const ops = [
  { insert: 'hello ' },
  createBoxInsertOp({ type: 'mention', id: '1', data: { name: 'user' } }),
  { insert: ' world' }
];

// 当光标在Box上时，向前导航到Box开头
const preWordStart1 = editorGetPreWordStart(ops, 6); // 返回 6（Box开头）

// 当光标在Box上时，向后导航到Box结尾
const nextWordEnd1 = editorGetNextWordEnd(ops, 6, 8); // 返回 7（Box结尾）

// 从其他位置导航时，Box作为强制边界
const preWordStart2 = editorGetPreWordStart(ops, 8); // 返回 7（Box后位置）
```

### 处理Space元素

```typescript
const ops = [
  { insert: 'hello   world' } // 多个连续空格
];

// 空格会被跳过，直到找到非空格字符
const preWordStart = editorGetPreWordStart(ops, 8); // 返回 0（'hello'开头）
const nextWordEnd = editorGetNextWordEnd(ops, 0, 13); // 返回 5（'hello'结尾）
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