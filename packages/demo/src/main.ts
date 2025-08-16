import { Editor } from '@ch-editor/core';
// import { setupEditorDebug } from '@ch-editor/debug';
import './style.css';

let doc = localStorage.getItem('doc');
if (doc) {
  doc = JSON.parse(doc);
  // doc = undefined;
}

const app = document.querySelector<HTMLDivElement>('#app')!;
const editor = new Editor(app, { initDoc: doc });
editor.focus();

const docElement = document.querySelector<HTMLDivElement>('#doc') as HTMLElement;
docElement.innerText = JSON.stringify(editor.doc.doc);

const mousePointSign = document.createElement('div');
mousePointSign.id = 'mouse-point-sign';
mousePointSign.style.position = 'absolute';
mousePointSign.style.width = '100px';
mousePointSign.style.height = '22px';
mousePointSign.style.pointerEvents = 'none';
mousePointSign.style.zIndex = '9999';
mousePointSign.style.top = '0';
document.body.appendChild(mousePointSign);
app.addEventListener('mousedown', (e) => {
  const { clientX, clientY } = e;
  mousePointSign.innerText = `${clientX}, ${clientY}`;
});

setInterval(() => {
  docElement.innerText = JSON.stringify(editor.doc.doc, undefined, 2);
  localStorage.setItem('doc', JSON.stringify(editor.doc.doc));
}, 1000)

;(window as any).editor = editor;

// setupEditorDebug(app);
