import { Editor } from './editor/editor'
import './caret/caret'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!
const editor = new Editor(app, {});
editor.focus();


const doc = document.querySelector<HTMLDivElement>('#doc') as HTMLElement;
doc.innerText = JSON.stringify(editor.doc.doc);

setInterval(() => {
  doc.innerText = JSON.stringify(editor.doc.doc, undefined, 2);
}, 1000);

(window as any).editor = editor;