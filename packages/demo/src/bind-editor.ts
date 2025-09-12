import { Doc, Editor, LineBreaker, TextLine } from '@ch-editor/core';
import { initDebugTools } from '@ch-editor/debug';

const editorContainer = document.querySelector<HTMLDivElement>('#editor')!;

let initDoc = null;
try {
  initDoc = JSON.parse(localStorage.getItem('doc') || '');
} catch (error) {
  console.log('initDoc error', error);
}

console.log('initDoc: ', initDoc);
export const editor = new Editor(editorContainer, {
  initDoc: new Doc(initDoc)
});
editor.focus();

(window as any).editor = editor;

// 初始化调试工具
const debugManager = initDebugTools();
// 监听文档变化
editor.editorDoc.hooks.register('docChange', () => {
  debugManager.updateDocInfo(editor.editorDoc.getDoc().doc);

  requestIdleCallback(() => {
    const blockId = editor.selection.range.start.blockId;
    const block = editor.findBlockById(blockId)!;
    const lineBreaker = new LineBreaker(block);
    debugManager.updateLines(lineBreaker.lines as TextLine[]);
  });

  localStorage.setItem('doc', JSON.stringify(editor.editorDoc.getDoc().doc));
});

editor.on('selectionChange', () => {

  requestIdleCallback(() => {
    const blockId = editor.selection.range.start.blockId;
    const block = editor.findBlockById(blockId)!;
    const lineBreaker = new LineBreaker(block);
    debugManager.updateLines(lineBreaker.lines as TextLine[]);
  });
});
