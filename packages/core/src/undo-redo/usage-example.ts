/**
 * 使用示例：如何在编辑器中集成快照收集功能
 */

import { Editor } from '../editor/editor';
import { EditorDoc } from '../doc/editor-doc';
import { registerSnapshotExtension } from './index';

// 示例1：基本使用
export function basicUsage() {
  const editor = new Editor();
  const editorDoc = new EditorDoc(editor);
  
  // 注册快照收集扩展
  const snapshotExtension = registerSnapshotExtension(editorDoc, 100);
  
  // 现在所有的编辑操作都会自动收集快照
  // editorDoc.localUpdateBlockText(...)
  // editorDoc.localInsertBlock(...)
  // editorDoc.localDeleteBlock(...)
  
  // 获取快照
  const snapshots = snapshotExtension.getSnapshots();
  console.log('当前快照数量:', snapshotExtension.getSnapshotCount());
  
  // 清理
  snapshotExtension.destroy();
}

// 示例2：自定义钩子处理
export function customHookUsage() {
  const editor = new Editor();
  const editorDoc = new EditorDoc(editor);
  
  // 注册自定义钩子
  editorDoc.hooks.on('beforeUpdateBlock', async (context) => {
    console.log('即将更新块:', context.containerId, context.blockIndex);
    // 可以在这里添加自定义逻辑，比如权限检查
  });
  
  editorDoc.hooks.on('afterUpdateBlock', async (context) => {
    console.log('块更新完成:', context.containerId, context.blockIndex);
    // 可以在这里添加自定义逻辑，比如自动保存
  });
  
  // 然后再注册快照收集（会与自定义钩子共存）
  const snapshotExtension = registerSnapshotExtension(editorDoc);
  
  return { editorDoc, snapshotExtension };
}

// 示例3：多个扩展共存
export function multipleExtensions() {
  const editor = new Editor();
  const editorDoc = new EditorDoc(editor);
  
  // 扩展1：快照收集
  const snapshotExtension = registerSnapshotExtension(editorDoc);
  
  // 扩展2：自动保存
  editorDoc.hooks.on('afterUpdateBlock', async (context) => {
    // 模拟自动保存
    await saveToServer(context);
  });
  
  // 扩展3：协作同步
  editorDoc.hooks.on('afterInsertBlock', async (context) => {
    // 模拟协作同步
    await syncToCollaborators(context);
  });
  
  return { editorDoc, snapshotExtension };
}

// 模拟函数
async function saveToServer(context: any) {
  console.log('保存到服务器:', context);
}

async function syncToCollaborators(context: any) {
  console.log('同步到协作者:', context);
}