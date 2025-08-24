import { Editor, LineBreaker, TextLine } from '@ch-editor/core';
import { initDebugTools } from '@ch-editor/debug';

const editorContainer = document.querySelector<HTMLDivElement>('#editor')!;
export const editor = new Editor(editorContainer, {});
editor.focus();

(window as any).editor = editor;

// 初始化调试工具
const debugManager = initDebugTools();
// 监听文档变化
editor.on('docChange', () => {
  debugManager.updateDocInfo(editor.editorDoc.getDoc().doc);
  // debugManager.updateLines(editor.doc.doc.blocks);
  const blockId = editor.selection.range.start.blockId;
  const block = editor.findBlockById(blockId)!;
  const lineBreaker = new LineBreaker(block);

  debugManager.updateLines(lineBreaker.lines as TextLine[]);
});
editor.on('selectionChange', () => {
  const blockId = editor.selection.range.start.blockId;
  const block = editor.findBlockById(blockId)!;
  const lineBreaker = new LineBreaker(block);

  debugManager.updateLines(lineBreaker.lines as TextLine[]);
});
