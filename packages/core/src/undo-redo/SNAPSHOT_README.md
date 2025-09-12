# 编辑器快照收集功能

## 概述

本功能为编辑器的核心控制层 `EditorDoc` 添加了完整的操作快照收集机制，用于支持撤销/重做功能。快照收集在每个文档操作的关键时机自动进行，包括操作前后的文档状态和选区状态。

## 功能特性

### 1. 自动快照收集
- **操作前快照**: 在每个操作执行前自动收集当前状态
- **操作后快照**: 在操作完成后收集新状态
- **选区快照**: 同时收集操作前后的选区状态
- **智能存储**: 自动限制快照数量，移除最旧的快照

### 2. 支持的操作类型
- `update`: 文本块内容更新
- `insert`: 插入新的文本块
- `delete`: 删除文本块
- `insertBox`: 插入Box元素
- `deleteBox`: 删除Box元素

### 3. 快照数据结构

#### BlockSnapshot (块快照)
```typescript
interface BlockSnapshot {
  blockId: string;        // 块ID
  containerId: string;    // 容器ID
  blockIndex: number;     // 块索引
  blockData: DocBlock;    // 块数据（深拷贝）
  timestamp: number;      // 时间戳
}
```

#### SelectionSnapshot (选区快照)
```typescript
interface SelectionSnapshot {
  anchor: {               // 锚点位置
    blockId: string;
    offset: number;
    type: string;
  };
  focus: {                // 焦点位置
    blockId: string;
    offset: number;
    type: string;
  };
  timestamp: number;      // 时间戳
}
```

#### OperationSnapshot (操作快照)
```typescript
interface OperationSnapshot {
  type: 'update' | 'insert' | 'delete' | 'insertBox' | 'deleteBox';
  containerId: string;
  blockIndex: number;
  beforeBlock?: BlockSnapshot;     // 操作前的块状态
  afterBlock?: BlockSnapshot;      // 操作后的块状态
  beforeSelection?: SelectionSnapshot; // 操作前的选区状态
  afterSelection?: SelectionSnapshot;  // 操作后的选区状态
  operationData?: any;             // 操作相关的额外数据
  timestamp: number;
}
```

## 使用方法

### 1. 基本使用

快照收集功能已集成到 `EditorDoc` 中，无需额外配置即可自动工作：

```typescript
// 创建编辑器实例
const editor = new Editor(parentElement);

// 执行任何编辑操作，快照会自动收集
editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);
editor.editorDoc.localInsertBlock(containerId, blockIndex, blockData);
editor.editorDoc.localDeleteBlock(containerId, blockIndex);
```

### 2. 获取快照历史

```typescript
// 获取所有操作快照
const snapshots = editor.editorDoc.getOperationSnapshots();
console.log('快照数量:', snapshots.length);

// 获取最新的快照
const latestSnapshot = snapshots[snapshots.length - 1];
console.log('最新操作:', latestSnapshot.type);
```

### 3. 清空快照历史

```typescript
// 清空所有快照
editor.editorDoc.clearSnapshots();
```

### 4. 使用快照管理器（示例）

```typescript
import { SnapshotManager, demonstrateSnapshotUsage } from './snapshot-demo';

// 创建快照管理器
const snapshotManager = new SnapshotManager(editor.editorDoc);

// 或者使用演示功能（包含键盘快捷键绑定）
const manager = demonstrateSnapshotUsage(editor);

// 手动撤销/重做
snapshotManager.undo();  // 撤销
snapshotManager.redo();  // 重做

// 检查状态
const info = snapshotManager.getUndoStackInfo();
console.log('可撤销:', info.canUndo, '可重做:', info.canRedo);
```

## 设计思路

### 1. 收集时机选择

快照收集的时机经过仔细分析，选择在以下关键点进行：

- **操作前**: 在调用底层 `doc` 方法之前收集当前状态
- **渲染后**: 在完成DOM渲染和选区更新之后收集最终状态
- **事件触发前**: 在触发 `docChange` 事件之前完成快照收集

这样的设计确保了：
- 捕获完整的状态变化过程
- 不影响现有的操作流程
- 为撤销/重做提供准确的恢复点

### 2. 数据完整性

- **深拷贝**: 所有快照数据都进行深拷贝，避免引用问题
- **容错处理**: 快照创建失败时不影响正常操作
- **内存管理**: 限制快照数量，防止内存泄漏

### 3. 性能考虑

- **按需收集**: 只在实际操作时收集快照
- **数据压缩**: 只保存必要的状态信息
- **异步处理**: 快照收集不阻塞主要操作流程

## 调试功能

### 1. 控制台输出

每次快照收集都会在控制台输出详细信息：

```
📸 Operation Snapshot Collected: {
  type: "update",
  containerId: "root",
  blockIndex: 0,
  beforeBlock: { blockId: "block-1", text: [...] },
  afterBlock: { blockId: "block-1", text: [...] },
  beforeSelection: { anchor: {...}, focus: {...} },
  afterSelection: { anchor: {...}, focus: {...} },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### 2. 快照分析工具

使用 `SnapshotAnalyzer` 可以分析快照数据：

```typescript
import { SnapshotAnalyzer } from './snapshot-demo';

// 分析快照
SnapshotAnalyzer.analyzeSnapshot(snapshot);
```

## 扩展建议

### 1. 撤销/重做控制器

基于收集的快照数据，可以实现完整的撤销/重做控制器：

- 状态恢复逻辑
- 批量操作合并
- 选择性撤销
- 分支历史管理

### 2. 协同编辑支持

快照数据可以用于协同编辑场景：

- 操作冲突检测
- 状态同步
- 版本控制

### 3. 性能优化

- 增量快照（只保存变化部分）
- 压缩算法
- 后台持久化

## 注意事项

1. **内存使用**: 快照会占用额外内存，建议根据实际需求调整 `maxSnapshotCount`
2. **性能影响**: 深拷贝操作有一定性能开销，大文档时需要注意
3. **数据一致性**: 确保快照数据与实际状态保持一致
4. **错误处理**: 快照创建失败不应影响正常编辑功能

## 总结

本快照收集功能为编辑器提供了完整的状态追踪能力，为实现撤销/重做、协同编辑等高级功能奠定了基础。通过在关键操作点自动收集快照，确保了数据的完整性和一致性，同时保持了良好的性能表现。