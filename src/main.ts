import { Editor } from './editor/editor'
import './caret/caret'
import './style.css'
import { setupEditorDebug } from './debug/example';

const app = document.querySelector<HTMLDivElement>('#app')!
const editor = new Editor(app, {});
editor.focus();


const doc = document.querySelector<HTMLDivElement>('#doc') as HTMLElement;
doc.innerText = JSON.stringify(editor.doc.doc);


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
})


setInterval(() => {
  doc.innerText = JSON.stringify(editor.doc.doc, undefined, 2);
}, 1000);

(window as any).editor = editor;

setupEditorDebug(app)
