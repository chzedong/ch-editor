import { Editor } from './editor';
import { editorInsertText } from '../text/insert-text';
import { createElement } from '../utils/dom';

import { InputHandler } from '../index.type';

export class EditorInput {
  inputElement: HTMLInputElement;

  private inputHandler: InputHandler[] = [];

  constructor(private editor: Editor) {
    this.inputElement = createElement('input', ['editor-input'], editor.rootContainer);
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('keydown', this.handleKeyDown);
  }

  handleInput = (event: Event) => {
    // get text position
    if ((event as InputEvent).data) {
      editorInsertText(this.editor, (event as InputEvent).data as string);
      this.inputElement.value = '';
    }
  };

  handleKeyDown = (event: KeyboardEvent) => {
    // this.editor.
    for (const handler of this.inputHandler) {
      if (handler.handleKeyDown(this.editor, event)) {
        event.preventDefault();
        return;
      }
    }
  };

  focus() {
    // this.editor.selection.caret.update()
    setTimeout(() => {

      this.inputElement.focus();
    });
  }

  addHandler(handler: InputHandler) {
    this.inputHandler.push(handler);
  }
}
