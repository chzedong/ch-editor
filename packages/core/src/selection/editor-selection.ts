import { Editor } from '../editor/editor';
import { EditorSelectionRange } from './selection-range';
import { clearAllSelection, getRangeBlocks, updateSelection } from './selection-utils';
import { getBlockId, getBlockType } from '../block/block-dom';
import { Caret } from '../caret/caret';
import { EditorBlockPosition } from './block-position';
import { assert } from '../utils/assert';

export class EditorSelection {
  readonly caret: Caret;

  _range: EditorSelectionRange;

  constructor(private editor: Editor) {
    this.caret = new Caret(this.editor);
    const block = editor.getFirstBlock();
    const blockId = getBlockId(block);
    const pos = new EditorBlockPosition(blockId, 0);
    this._range = new EditorSelectionRange(editor, { anchor: pos, focus: pos });

    setTimeout(() => {
      this.caret.update();
    });
  }

  get range() {
    return this._range;
  }

  verifyPos(pos: EditorBlockPosition) {
    const block = this.editor.getBlockById(pos.blockId);
    const type = getBlockType(block);
    const ok = pos.offset >= 0 && pos.offset <= this.editor.editorBlocks.getBlockClass(type).getBlockTextLength(block);
    assert(ok, 'invalid block position');
  }

  setSelection(anchor: EditorBlockPosition, focus: EditorBlockPosition) {
    if (!focus) {
      focus = anchor;
    }
    this.verifyPos(anchor);
    this.verifyPos(focus);
    const newRange = new EditorSelectionRange(this.editor, { anchor, focus });
    if (this._range.isEqual(newRange)) {
      return this._range;
    }

    clearAllSelection(this.editor);

    this._range = newRange;
    this.caret.update();

    // update selection
    updateSelection(this.editor);

    this.editor.focus();
    this.editor.emit('selectionChange');
    return this._range;
  }

  getSelectedBlocks() {
    return getRangeBlocks(this.editor, this._range);
  }
}
