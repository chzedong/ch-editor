import { EditorBlockPosition } from './block-position';
import { Editor } from '../editor/editor';

export class EditorSelectionRange {
  readonly editor: Editor;
  readonly reverse: boolean;
  private _anchor: EditorBlockPosition;
  private _focus: EditorBlockPosition;

  constructor(editor: Editor, options: { anchor: EditorBlockPosition; focus: EditorBlockPosition }) {
    this.editor = editor;
    this._anchor = options.anchor;
    this._focus = options.focus;
    // TODO: 简单选区是否reverse
    if (this.anchor.blockId === this.focus.blockId) {
      this.reverse = this.focus.offset < this.anchor.offset;
    } else {
      const containerId = 'root';
      const anchorBlockIndex = this.editor.editorDoc.getBlockIndexById(containerId, this.anchor.blockId);
      const focusBlockIndex = this.editor.editorDoc.getBlockIndexById(containerId, this.focus.blockId);

      this.reverse = focusBlockIndex < anchorBlockIndex ? true : false;
    }
  }

  get start() {
    return this.reverse ? this._focus : this._anchor;
  }

  get end() {
    return this.reverse ? this._anchor : this._focus;
  }

  get anchor() {
    return this._anchor;
  }

  get focus() {
    return this._focus;
  }

  isCollapsed(): boolean {
    return this.start.blockId === this.end.blockId && this.start.offset === this.end.offset;
  }

  isReverse() {
    return this.reverse;
  }

  isEqual(other: EditorSelectionRange) {
    const { start, end } = other;

    const ret =
      this.start.blockId === start.blockId &&
      this.start.offset === start.offset &&
      this.end.blockId === end.blockId &&
      this.end.offset === end.offset &&
      this.start.type === start.type &&
      this.end.type === end.type;

    return ret;
  }
}
