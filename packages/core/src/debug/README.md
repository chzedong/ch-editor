# Line模型可视化调试工具

这个调试工具通过监听DOM变化和图形绘制的方式，可视化展示编辑器中多行文本的索引和矩形区域信息，帮助开发者理解和调试line模型的工作原理。

## 功能特性

### 🎯 核心功能
- **实时可视化**: 通过MutationObserver监听DOM变化，实时更新可视化内容
- **多层次展示**: 同时显示行级、项目级和字符级的信息
- **交互式调试**: 支持键盘快捷键快速切换可视化状态
- **性能优化**: 只在启用时进行绘制，不影响正常编辑性能

### 📊 可视化内容
1. **行边界**: 蓝色虚线框显示每一行的边界和行号
2. **项目边界**: 红色虚线框显示每个LineItem的边界和索引范围
3. **字符矩形**: 青色实线框显示每个字符的精确位置和索引

## 快速开始

### 基本使用

```typescript
import { initDebugTools, toggleLineVisualizer } from './debug';

// 1. 初始化调试工具
const editorContainer = document.getElementById('editor');
initDebugTools(editorContainer);

// 2. 切换可视化（也可以使用快捷键 Ctrl+Shift+D）
toggleLineVisualizer();
```

### 完整示例

```typescript
import { setupEditorDebug } from './debug/example';

// 在编辑器初始化后调用
const editorContainer = document.getElementById('editor');
setupEditorDebug(editorContainer);
```

## API 参考

### DebugManager

主要的调试管理器类，提供以下方法：

```typescript
class DebugManager {
  // 初始化调试工具
  init(container: HTMLElement): void
  
  // 切换line可视化
  toggleLineVisualizer(): void
  
  // 启用line可视化
  enableLineVisualizer(): void
  
  // 禁用line可视化
  disableLineVisualizer(): void
  
  // 更新line数据
  updateLines(lines: TextLine[]): void
  
  // 销毁调试工具
  destroy(): void
}
```

### LineVisualizer

核心的可视化组件：

```typescript
class LineVisualizer {
  constructor(container: HTMLElement)
  
  // 启用/禁用可视化
  enable(): void
  disable(): void
  toggle(): void
  
  // 设置要可视化的行数据
  setLines(lines: TextLine[]): void
  
  // 销毁可视化器
  destroy(): void
}
```

### 便捷函数

```typescript
// 初始化调试工具
initDebugTools(container: HTMLElement): void

// 切换line可视化
toggleLineVisualizer(): void

// 更新line数据用于可视化
updateLinesForVisualization(lines: TextLine[]): void
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Shift + D` | 切换line可视化开关 |

## 可视化图例

### 颜色说明
- 🔵 **蓝色虚线框**: 行边界 (TextLine)
- 🔴 **红色虚线框**: 项目边界 (LineItem)
- 🟢 **青色实线框**: 字符边界 (Character)

### 标注信息
- **行号**: 显示在每行左上角，格式为 `Line 0`, `Line 1`...
- **索引范围**: 显示在每个项目上方，格式为 `[startOffset-endOffset]`
- **字符索引**: 显示在每个字符框内，表示该字符在整个文档中的位置

## 技术实现

### 架构设计
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LineBreaker   │───▶│  DebugManager    │───▶│ LineVisualizer  │
│   (数据源)      │    │   (管理器)       │    │   (可视化)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
  自动通知line数据变化      管理可视化状态           Canvas绘制
```

### 核心特性
1. **非侵入式**: 调试功能不影响编辑器正常运行
2. **实时更新**: 通过MutationObserver监听DOM变化
3. **性能优化**: 只在需要时进行绘制和计算
4. **错误隔离**: 调试功能异常不会影响编辑器功能

## 使用场景

### 开发调试
- 理解line模型的工作原理
- 调试光标定位问题
- 验证文本索引计算
- 分析多行文本布局

### 性能分析
- 观察DOM变化频率
- 分析重绘性能
- 优化布局算法

### 功能验证
- 验证换行逻辑
- 测试边界情况
- 确认索引映射正确性

## 注意事项

1. **性能影响**: 可视化功能会消耗额外的计算资源，建议只在开发环境使用
2. **浏览器兼容性**: 使用了Canvas API和MutationObserver，需要现代浏览器支持
3. **内存管理**: 长时间使用后建议手动调用`destroy()`方法释放资源
4. **调试信息**: 可视化信息可能会遮挡编辑器内容，注意调整透明度

## 故障排除

### 常见问题

**Q: 可视化没有显示？**
A: 检查是否正确初始化了调试工具，确保容器元素存在

**Q: 快捷键不工作？**
A: 确保页面焦点在编辑器区域，检查是否有其他快捷键冲突

**Q: 性能问题？**
A: 可视化功能会影响性能，建议在不需要时及时关闭

**Q: 显示不准确？**
A: 检查line数据是否正确更新，可能需要手动调用`updateLines()`

## 扩展开发

如果需要扩展调试功能，可以：

1. 继承`LineVisualizer`类添加新的可视化内容
2. 在`DebugManager`中添加新的调试工具
3. 扩展快捷键支持更多调试功能
4. 添加配置选项自定义可视化样式

```typescript
// 扩展示例
class CustomLineVisualizer extends LineVisualizer {
  // 添加自定义绘制逻辑
  private drawCustomInfo(): void {
    // 自定义可视化内容
  }
}
```