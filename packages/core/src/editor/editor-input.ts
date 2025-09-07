import { Editor } from './editor';
import { editorInsertText } from '../text/text-action';
import { createElement } from '../utils/dom';

import { InputHandler } from '../index.type';

export class EditorInput {
  inputElement: HTMLInputElement;

  private inputHandler: InputHandler[] = [];

  constructor(private editor: Editor) {
    this.inputElement = createElement('input', ['editor-input'], null);
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('keydown', this.handleKeyDown);
    setTimeout(() => {
      this.editor.rootContainer.appendChild(this.inputElement);
    });
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

  // eslint-disable-next-line no-undef
  focus(options: FocusOptions = {}) {
    setTimeout(() => {
      this.inputElement.focus(options);
    });
  }

  addHandler(handler: InputHandler) {
    this.inputHandler.push(handler);
  }
}
