import { Editor } from '../editor/editor';
import { EditorSelectionRange } from './selection-range';
import { clearAllSelection, updateSelection } from './selection-utils';
import { getBlockId, getBlockIndex, getBlockType } from '../block/block-dom';
import { Caret } from '../caret/caret';
import { EditorBlockPosition } from './block-position';
import { assert } from '../utils/assert';
import { getContainerId, getParentContainer } from '../container/container-dom';

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
    const { start, end } = this._range;

    const startBlock = this.editor.getBlockById(start.blockId);
    let startIndex = getBlockIndex(startBlock);

    const endBlock = this.editor.getBlockById(end.blockId);
    const endIndex = getBlockIndex(endBlock);

    const container = getParentContainer(startBlock);
    const containerId = getContainerId(container);
    if (start.blockId === end.blockId) {
      return [{ block: startBlock, anchor: start.offset, focus: end.offset }];
    }

    const blocks: { block: HTMLElement; anchor: number; focus: number }[] = [];

    const blockLen = this.editor.getBlockTextLength(startBlock);
    blocks.push({ block: startBlock, anchor: start.offset, focus: blockLen });
    startIndex++;

    while (startIndex < endIndex) {
      const block = this.editor.findBlockByIndex(containerId, startIndex);
      assert(block, 'invalid block');

      blocks.push({ block, anchor: 0, focus: this.editor.getBlockTextLength(block) });

      startIndex++;
    }
    if (startIndex === endIndex) {
      blocks.push({ block: endBlock, anchor: 0, focus: end.offset });
    }

    return blocks;
  }
}
