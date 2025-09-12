/**
 * 快照功能演示文件
 * 展示如何使用EditorDoc的快照收集功能
 */

import { EditorDoc, OperationSnapshot, BlockSnapshot, SelectionSnapshot } from './editor-doc';
import { Editor } from '../editor/editor';
import { DocBlock } from '../index.type';

/**
 * 快照管理器示例
 * 用于演示如何基于收集的快照实现撤销/重做功能
 */
export class SnapshotManager {
  private editorDoc: EditorDoc;
  private undoStack: OperationSnapshot[] = [];
  private redoStack: OperationSnapshot[] = [];
  private maxUndoSteps: number = 50;

  constructor(editorDoc: EditorDoc) {
    this.editorDoc = editorDoc;
  }

  /**
   * 从EditorDoc同步快照到撤销栈
   */
  syncSnapshots() {
    const snapshots = this.editorDoc.getOperationSnapshots();
    // 只同步新的快照
    const newSnapshots = snapshots.slice(this.undoStack.length);
    
    newSnapshots.forEach(snapshot => {
      this.addToUndoStack(snapshot);
    });
  }

  /**
   * 添加快照到撤销栈
   */
  private addToUndoStack(snapshot: OperationSnapshot) {
    this.undoStack.push(snapshot);
    
    // 限制撤销栈大小
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    
    // 清空重做栈
    this.redoStack = [];
    
    console.log('🔄 Snapshot added to undo stack:', {
      type: snapshot.type,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length
    });
  }

  /**
   * 撤销操作
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      console.log('⚠️ No operations to undo');
      return false;
    }

    const snapshot = this.undoStack.pop()!;
    this.redoStack.push(snapshot);
    
    console.log('↩️ Undoing operation:', {
      type: snapshot.type,
      containerId: snapshot.containerId,
      blockIndex: snapshot.blockIndex,
      timestamp: new Date(snapshot.timestamp).toISOString()
    });
    
    // 这里应该实现具体的撤销逻辑
    // 根据snapshot的类型和数据恢复到之前的状态
    this.restoreFromSnapshot(snapshot, 'undo');
    
    return true;
  }

  /**
   * 重做操作
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      console.log('⚠️ No operations to redo');
      return false;
    }

    const snapshot = this.redoStack.pop()!;
    this.undoStack.push(snapshot);
    
    console.log('↪️ Redoing operation:', {
      type: snapshot.type,
      containerId: snapshot.containerId,
      blockIndex: snapshot.blockIndex,
      timestamp: new Date(snapshot.timestamp).toISOString()
    });
    
    // 这里应该实现具体的重做逻辑
    this.restoreFromSnapshot(snapshot, 'redo');
    
    return true;
  }

  /**
   * 从快照恢复状态（示例实现）
   */
  private restoreFromSnapshot(snapshot: OperationSnapshot, direction: 'undo' | 'redo') {
    console.log(`🔧 Restoring from snapshot (${direction}):`, {
      type: snapshot.type,
      beforeBlock: snapshot.beforeBlock ? {
        blockId: snapshot.beforeBlock.blockId,
        text: snapshot.beforeBlock.blockData.text
      } : null,
      afterBlock: snapshot.afterBlock ? {
        blockId: snapshot.afterBlock.blockId,
        text: snapshot.afterBlock.blockData.text
      } : null,
      beforeSelection: snapshot.beforeSelection,
      afterSelection: snapshot.afterSelection
    });
    
    // TODO: 实现具体的恢复逻辑
    // 1. 根据操作类型恢复文档状态
    // 2. 恢复选区状态
    // 3. 重新渲染
  }

  /**
   * 获取撤销栈状态
   */
  getUndoStackInfo() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0
    };
  }

  /**
   * 清空所有快照
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.editorDoc.clearSnapshots();
    console.log('🗑️ All snapshots and stacks cleared');
  }
}

/**
 * 快照分析工具
 * 用于分析和调试快照数据
 */
export class SnapshotAnalyzer {
  static analyzeSnapshot(snapshot: OperationSnapshot) {
    console.log('🔍 Snapshot Analysis:', {
      operation: {
        type: snapshot.type,
        containerId: snapshot.containerId,
        blockIndex: snapshot.blockIndex,
        timestamp: new Date(snapshot.timestamp).toISOString()
      },
      changes: {
        blockChanged: this.hasBlockChanged(snapshot.beforeBlock, snapshot.afterBlock),
        selectionChanged: this.hasSelectionChanged(snapshot.beforeSelection, snapshot.afterSelection),
        textLengthChange: this.getTextLengthChange(snapshot.beforeBlock, snapshot.afterBlock)
      },
      data: snapshot.operationData
    });
  }

  private static hasBlockChanged(before?: BlockSnapshot, after?: BlockSnapshot): boolean {
    if (!before || !after) return true;
    return JSON.stringify(before.blockData) !== JSON.stringify(after.blockData);
  }

  private static hasSelectionChanged(before?: SelectionSnapshot, after?: SelectionSnapshot): boolean {
    if (!before || !after) return true;
    return (
      before.anchor.blockId !== after.anchor.blockId ||
      before.anchor.offset !== after.anchor.offset ||
      before.focus.blockId !== after.focus.blockId ||
      before.focus.offset !== after.focus.offset
    );
  }

  private static getTextLengthChange(before?: BlockSnapshot, after?: BlockSnapshot): number {
    if (!before || !after) return 0;
    
    const beforeLength = before.blockData.text?.reduce((sum, op) => {
      return sum + (typeof op.insert === 'string' ? op.insert.length : 0);
    }, 0) || 0;
    
    const afterLength = after.blockData.text?.reduce((sum, op) => {
      return sum + (typeof op.insert === 'string' ? op.insert.length : 0);
    }, 0) || 0;
    
    return afterLength - beforeLength;
  }
}

/**
 * 使用示例
 */
export function demonstrateSnapshotUsage(editor: Editor) {
  console.log('🚀 Starting snapshot demonstration...');
  
  const snapshotManager = new SnapshotManager(editor.editorDoc);
  
  // 监听文档变化，同步快照
  editor.on('docChange', () => {
    snapshotManager.syncSnapshots();
    
    // 分析最新的快照
    const snapshots = editor.editorDoc.getOperationSnapshots();
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[snapshots.length - 1];
      SnapshotAnalyzer.analyzeSnapshot(latestSnapshot);
    }
  });
  
  // 绑定键盘快捷键（示例）
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        snapshotManager.undo();
      } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
        event.preventDefault();
        snapshotManager.redo();
      }
    }
  });
  
  console.log('✅ Snapshot demonstration setup complete!');
  console.log('💡 Try editing the document and use Ctrl+Z/Ctrl+Y to undo/redo');
  
  return snapshotManager;
}