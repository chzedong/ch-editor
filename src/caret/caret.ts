import { Editor } from '../editor/editor';
import { isTextKindBlock } from '../editor/editor-blocks';
import { getTextCaretRect } from '../line/index';
import { createElement } from '../utils/dom';
import './caret.scss';

export class Caret {
  caret: HTMLElement;
  constructor(private editor: Editor) {
    this.caret = createElement('div', ['editor-caret'], editor.rootContainer);
    // this.update()
  }

  private hasCaret() {
    if (!this.editor.selection.range.isCollapsed()) {
      return false;
    }
    const block = this.editor.getBlockById(this.editor.selection.range.start.blockId);

    if (!isTextKindBlock(this.editor, block)) {
      return false;
    }

    return true;
  }

  update() {
    if (!this.hasCaret()) {
      this.caret.style.display = 'none';
      return;
    } else {
      this.caret.style.display = '';
    }
    const { range } = this.editor.selection;
    const pos = range.start;
    const rect: DOMRect = getTextCaretRect(this.editor.getBlockById(pos.blockId), pos);

    const contentRect = this.editor.rootContainer.getBoundingClientRect();
    const x = rect.left - contentRect.left;
    const y = rect.top - contentRect.top;
    this.caret.style.left = `${x}px`;
    this.caret.style.top = `${y}px`;
    this.caret.style.height = `${rect.height}px`;

    const input = this.editor.input.inputElement;
    input.style.left = `${x}px`;
    // 需要微调
    input.style.top = `${y}px`;

  }
}

export const isCaret = (dom: HTMLElement) => {
  return dom.classList.contains('editor-caret');
};
