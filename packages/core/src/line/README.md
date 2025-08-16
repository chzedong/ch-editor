# Line Model 文档

## 概述

Line Model 是一个专为富文本编辑器设计的多行文本字符偏移位置计算模型。它基于自主研发的输入引擎架构，采用Block-oriented文档结构，为解决自动换行引发的选区复杂性而引入的Line元数据抽象层。

### 核心架构特点

- **流式文档模型**: 每个文本块(block)作为独立布局单元，支持区块级选区管理
- **混合排版引擎**: 深度集成浏览器排版引擎，通过CSS word-break+overflow-wrap实现精准渲染
- **Line抽象层**: 提供行级坐标映射(clientRect ↔ textOffset)、断行边界检测和光标定位补偿机制

该模型提供了双向检索能力，可以通过字符偏移找到矩形位置，也可以通过矩形或坐标找到字符索引，专门解决浏览器原生换行导致的视觉呈现与逻辑位置映射问题。

## 核心功能

### 1. 双向检索
- **偏移量 → 坐标**: 通过字符偏移量获取光标的矩形位置
- **坐标 → 偏移量**: 通过x,y坐标获取对应的字符偏移量

### 2. 边界情况处理
- 处理x,y坐标位于行尾同时位于段落节点内的情况
- 根据行的高度判断坐标在哪一行
- 通过`SimpleBlockPosition`的`type`字段区分行首和行尾的相同索引

### 3. 多行文本支持
- 自动检测文本节点是否跨越多行
- 计算每行每个文本节点的字符偏移位置
- 处理自动换行导致的文本分割

## 类型定义

### SimpleBlockPosition
```typescript
export interface SimpleBlockPosition {
  offset: number;                    // 字符偏移量
  type: SimpleBlockPositionType;     // 位置类型
  blockId: string;                   // 块标识符
}

export type SimpleBlockPositionType = 'home' | 'end' | 'middle';
```

- `home`: 行首位置
- `end`: 行尾位置  
- `middle`: 行中间位置

**注意**: `blockId` 字段用于标识位置所属的文本块，确保跨块操作的准确性。

### LineItem
```typescript
export interface LineItem {
  child: Element;              // DOM元素
  startBlockOffset: number;    // 在块中的起始偏移量
  endBlockOffset: number;      // 在块中的结束偏移量
  contentRect: DOMRect;        // 元素的矩形区域
}
```

## 核心类

### TextLine
管理单行的信息，包括起始偏移、结束偏移和包含的子元素。

```typescript
class TextLine {
  get start(): number          // 行的起始偏移量
  get end(): number            // 行的结束偏移量
  get items(): LineItem[]      // 行包含的子元素
  
  addChild(child, textLength, contentRect): void
  getLineRect(): DOMRect
  containsOffset(offset, type): boolean
}
```

### LineBreaker
负责解析文本块，生成所有行的信息。

```typescript
class LineBreaker {
  constructor(block: BlockElement)
  
  get lineCount(): number      // 总行数
  get lines(): TextLine[]      // 所有行
  
  // 核心方法
  getLineIndex(position: SimpleBlockPosition): number
  getLine(position: SimpleBlockPosition): TextLine
  getPositionFromPoint(x: number, y: number): SimpleBlockPosition
  getCaretRect(position: SimpleBlockPosition): DOMRect
}
```

## 主要API

### getTextCaretRect
根据偏移量获取光标矩形位置。

```typescript
function getTextCaretRect(block: BlockElement, pos: SimpleBlockPosition): DOMRect
```

### getPositionFromPoint
根据坐标获取字符位置。

```typescript
function getPositionFromPoint(block: BlockElement, x: number, y: number): SimpleBlockPosition
```

### getLineBreaker
获取行分割器实例。

```typescript
function getLineBreaker(block: BlockElement): LineBreaker
```

## 使用示例

```typescript
import { getTextCaretRect, getPositionFromPoint, getLineBreaker } from './line';

// 获取光标位置
const block = document.getElementById('textBlock') as BlockElement;
const position = { offset: 10, type: 'middle', blockId: block.id };
const caretRect = getTextCaretRect(block, position);
console.log('光标位置:', caretRect.left, caretRect.top);

// 从坐标获取位置
const clickPosition = getPositionFromPoint(block, 100, 50);
console.log('点击位置:', clickPosition.offset, clickPosition.type, clickPosition.blockId);

// 使用行分割器
const lineBreaker = getLineBreaker(block);
console.log('总行数:', lineBreaker.lineCount);

// 遍历所有行
lineBreaker.lines.forEach((line, index) => {
  console.log(`第${index + 1}行: ${line.start}-${line.end}`);
  line.items.forEach(item => {
    console.log(`  元素: "${item.child.textContent}"`);
  });
});

// 获取特定行的信息
const lineIndex = lineBreaker.getLineIndex(position);
const targetLine = lineBreaker.getLine(position);
console.log(`位置 ${position.offset} 在第 ${lineIndex + 1} 行`);
console.log(`该行包含 ${targetLine.items.length} 个元素`);
```

## 核心挑战与解决方案

### 1. 视觉呈现与逻辑位置的映射
- **挑战**: 浏览器原生换行导致block内产生多行视觉单元，需要精确建立坐标映射系统
- **解决方案**: 通过LineBreaker类解析DOM结构，建立字符偏移量与视觉坐标的双向映射

### 2. 自动换行识别
- **挑战**: 准确检测文本节点是否跨越多行，处理CJK/非CJK混合文本的复杂换行规则
- **解决方案**: 比较元素首尾客户端矩形，使用行高容差判断是否在同一行

### 3. 浏览器兼容性
- **挑战**: 核心API兼容性问题，特殊字符(零宽空格、Unicode复杂字符)的布局处理
- **解决方案**: 使用`caretPositionFromPoint`和`caretRangeFromPoint`的降级策略

### 4. 性能与精度平衡
- **挑战**: 高频光标操作需要亚毫秒级响应，大规模文档的布局分析效率
- **解决方案**: 支持缓存机制，按需解析可视区域内容

## 算法特点

### 1. 自动换行检测
- 通过比较元素的第一个和最后一个客户端矩形来判断是否跨行
- 使用行高容差来判断两个矩形是否在同一行

### 2. 精确位置计算
- 使用浏览器原生的`caretPositionFromPoint`或`caretRangeFromPoint` API
- 支持文本节点内的精确偏移量计算

### 3. 边界处理
- 处理空行、行首、行尾等特殊情况
- 支持通过`type`字段区分相同偏移量的不同语义位置

## 性能考虑

### 缓存策略
- 在`getLineBreaker`函数中实现缓存机制，避免重复解析同一块内容
- 使用块ID作为缓存键，确保缓存的准确性
- 布局变化时自动清理相关缓存

### 大型文档优化
- 建议按需解析，只处理可视区域的内容
- 实现虚拟滚动时，动态加载和卸载行信息
- 对于超长文本块，考虑分段处理

### 响应性能
- 高频光标操作(如键盘导航)需要亚毫秒级响应
- 避免在每次操作时重新创建LineBreaker实例
- 使用防抖机制处理连续的布局变化事件

### 内存管理
- 及时清理不再使用的行信息缓存
- 监听DOM变化，自动更新或清理相关数据
- 避免长期持有大量DOM引用

## 浏览器兼容性

- 支持现代浏览器的`caretPositionFromPoint`和`caretRangeFromPoint` API
- 对于不支持的浏览器，会降级到基本的坐标计算
- 特殊字符（零宽空格、Unicode复杂字符）的处理依赖浏览器实现

## 测试

项目包含一个测试页面 `test.html`，可以在浏览器中打开进行功能测试：

1. 测试光标位置计算
2. 测试坐标转位置功能
3. 测试行分割器的解析结果

## 注意事项

### DOM结构要求
- 文本块应该包含可获取客户端矩形的子元素
- 确保文本内容被正确包装在span或其他行内元素中
- 避免直接在块级元素中放置裸文本节点

### 布局稳定性
- 在调用API前确保DOM布局已完成(避免在样式加载期间调用)
- 使用`requestAnimationFrame`确保布局计算的准确性
- 监听字体加载完成事件，避免字体变化导致的布局偏移

### 坐标系统
- 所有坐标都是相对于视口的绝对坐标
- 考虑页面滚动对坐标计算的影响
- 在iframe环境中需要额外处理坐标转换

### 类型区分
- 合理使用`SimpleBlockPositionType`来区分行首行尾的相同偏移量
- `home`类型用于行首光标定位，`end`类型用于行尾
- `middle`类型用于行内任意位置

### 错误处理
- 处理空块、空行等边界情况
- 验证blockId的有效性，确保位置信息的准确性
- 对于无效的坐标输入，提供合理的降级处理