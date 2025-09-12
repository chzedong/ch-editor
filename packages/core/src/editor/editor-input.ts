import { Editor } from './editor';
import { editorInsertText } from '../text/text-action';
import { createElement } from '../utils/dom';

import { InputHandler } from '../index.type';

export class EditorInput {
  inputElement: HTMLInputElement;

  private inputHandler: InputHandler[] = [];
  private isComposing: boolean = false;
  private compositionText: string = '';

  constructor(private editor: Editor) {
    this.inputElement = createElement('input', ['editor-input'], null);
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('keydown', this.handleKeyDown);
    this.inputElement.addEventListener('compositionstart', this.handleCompositionStart);
    this.inputElement.addEventListener('compositionupdate', this.handleCompositionUpdate);
    this.inputElement.addEventListener('compositionend', this.handleCompositionEnd);
    setTimeout(() => {
      this.editor.rootContainer.appendChild(this.inputElement);
    });
  }

  handleInput = (event: Event) => {
    // 如果正在合成中文输入，不处理input事件
    if (this.isComposing) {
      return;
    }

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

  handleCompositionStart = (event: CompositionEvent) => {
    this.isComposing = true;
    this.compositionText = '';
  };

  handleCompositionUpdate = (event: CompositionEvent) => {
    this.compositionText = event.data || '';

    const range = this.editor.selection.range;
    const blockId = range.focus.blockId;
    const block = this.editor.getBlockById(blockId);

    this.editor.editorBlocks.forceRenderBlock(block);
    this.editor.selection.renderSelection(false, new WeakMap());
  };

  handleCompositionEnd = (event: CompositionEvent) => {
    this.isComposing = false;
    const finalText = event.data || this.compositionText;

    if (finalText) {
      editorInsertText(this.editor, finalText);
    }

    this.compositionText = '';
    this.inputElement.value = '';
  };

  addHandler(handler: InputHandler) {
    this.inputHandler.push(handler);
  }

  // 获取当前合成状态
  getCompositionState() {
    return {
      isComposing: this.isComposing,
      compositionText: this.compositionText
    };
  }
}
