# 编辑器钩子架构与快照收集扩展

## 概述

本模块实现了基于生命周期钩子的编辑器扩展架构，将原本耦合在 `EditorDoc` 中的快照收集功能解耦为独立的扩展模块。

## 架构设计

### 核心组件

1. **LifecycleHooks** (`../lifecycle/hooks.ts`)
   - 提供事件注册、触发机制
   - 支持异步钩子处理
   - 类型安全的钩子系统

2. **SnapshotCollector** (`./snapshot-collector.ts`)
   - 实现快照收集逻辑
   - 通过钩子监听编辑操作
   - 管理快照存储和清理

3. **EditorDoc** (`../doc/editor-doc.ts`)
   - 集成钩子系统
   - 在关键操作点触发钩子
   - 移除直接的快照收集代码

## 支持的钩子事件

### 块操作钩子

- `beforeUpdateBlock` - 块文本更新前
- `afterUpdateBlock` - 块文本更新后
- `beforeInsertBlock` - 块插入前
- `afterInsertBlock` - 块插入后
- `beforeDeleteBlock` - 块删除前
- `afterDeleteBlock` - 块删除后

### Box操作钩子

- `beforeInsertBox` - Box插入前
- `afterInsertBox` - Box插入后
- `beforeDeleteBox` - Box删除前
- `afterDeleteBox` - Box删除后

## 使用方式

### 基本使用

```typescript
import { Editor } from '../editor/editor';
import { EditorDoc } from '../doc/editor-doc';
import { registerSnapshotExtension } from './index';

// 创建编辑器实例
const editor = new Editor();
const editorDoc = new EditorDoc(editor);

// 注册快照收集扩展
const snapshotExtension = registerSnapshotExtension(editorDoc, 100);

// 现在所有编辑操作都会自动收集快照
// 获取快照
const snapshots = snapshotExtension.getSnapshots();
console.log('快照数量:', snapshotExtension.getSnapshotCount());

// 清理资源
snapshotExtension.destroy();
```

### 自定义钩子处理

```typescript
// 注册自定义钩子
editorDoc.hooks.on('beforeUpdateBlock', async (context) => {
  console.log('即将更新块:', context.containerId, context.blockIndex);
  // 权限检查、预处理等
});

editorDoc.hooks.on('afterUpdateBlock', async (context) => {
  console.log('块更新完成');
  // 自动保存、通知等
});
```

### 多扩展共存

```typescript
// 扩展1：快照收集
const snapshotExtension = registerSnapshotExtension(editorDoc);

// 扩展2：自动保存
editorDoc.hooks.on('afterUpdateBlock', async (context) => {
  await saveToServer(context);
});

// 扩展3：协作同步
editorDoc.hooks.on('afterInsertBlock', async (context) => {
  await syncToCollaborators(context);
});
```

## 钩子上下文数据

每个钩子都会接收相应的上下文数据：

### 块操作上下文

```typescript
interface BlockHookContext {
  containerId: string;
  blockIndex: number;
  selection: EditorSelectionRange;
  // 其他操作特定数据...
}
```

### Box操作上下文

```typescript
interface BoxHookContext {
  containerId: string;
  blockIndex: number;
  offset: number;
  selection: EditorSelectionRange;
  // 其他操作特定数据...
}
```

## 快照数据结构

```typescript
interface OperationSnapshot {
  type: 'update' | 'insert' | 'delete' | 'insertBox' | 'deleteBox';
  containerId: string;
  blockIndex: number;
  beforeBlock?: any;
  afterBlock?: any;
  beforeSelection: SelectionSnapshot;
  afterSelection: SelectionSnapshot;
  operationData: any;
  timestamp: number;
}
```

## 迁移指南

### 从旧版本迁移

1. **移除直接调用**
   ```typescript
   // 旧方式 - 不再可用
   // editorDoc.addOperationSnapshot(snapshot);
   // editorDoc.getOperationSnapshots();
   
   // 新方式
   const extension = registerSnapshotExtension(editorDoc);
   const snapshots = extension.getSnapshots();
   ```

2. **自定义快照逻辑**
   ```typescript
   // 如果需要自定义快照收集逻辑
   editorDoc.hooks.on('afterUpdateBlock', async (context) => {
     // 自定义快照收集
     const snapshot = createCustomSnapshot(context);
     saveSnapshot(snapshot);
   });
   ```

## 性能考虑

- 钩子采用异步执行，不会阻塞主要操作
- 快照收集使用深拷贝，注意内存使用
- 可通过 `maxSnapshotCount` 限制快照数量
- 及时调用 `destroy()` 清理资源

## 扩展开发

要开发新的编辑器扩展：

1. 创建扩展类
2. 在构造函数中注册所需钩子
3. 实现钩子处理逻辑
4. 提供清理方法

```typescript
class MyExtension {
  constructor(private editorDoc: EditorDoc) {
    this.registerHooks();
  }
  
  private registerHooks() {
    this.editorDoc.hooks.on('afterUpdateBlock', this.handleUpdate.bind(this));
  }
  
  private async handleUpdate(context: any) {
    // 扩展逻辑
  }
  
  destroy() {
    // 清理资源
  }
}
```

## 注意事项

1. 钩子处理函数应该是异步的
2. 避免在钩子中抛出未捕获的异常
3. 长时间运行的钩子可能影响编辑器性能
4. 记得在不需要时清理扩展资源