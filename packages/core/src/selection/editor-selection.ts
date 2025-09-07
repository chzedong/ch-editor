import { Editor } from '../editor/editor';
import { EditorSelectionRange } from './selection-range';
import { getRangeBlocks, updateSelection } from './selection-dom';
import {  getBlockType } from '../block/block-dom';
import { Caret } from '../caret/caret-render';
import { EditorBlockPosition } from './block-position';
import { assert } from '../utils/assert';
import { LineBreaker } from '../text/line/text-line';
import { removeBackgrounds } from '../text/text-dom';

import { BlockElement } from '../index.type';

export class EditorSelection {
  readonly caret: Caret;

  _range: EditorSelectionRange;

  constructor(private editor: Editor) {
    this.caret = new Caret(this.editor);
    const block = editor.editorDoc.getBlockByIndex('root', 0);
    const pos = new EditorBlockPosition(block.id, 0);
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

  setSelection(anchor: EditorBlockPosition, focus: EditorBlockPosition, isVerticalNavigation?: boolean, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    if (!focus) {
      focus = anchor;
    }
    this.verifyPos(anchor);
    this.verifyPos(focus);
    const newRange = new EditorSelectionRange(this.editor, { anchor, focus });
    if (this._range.isEqual(newRange)) {
      return this._range;
    }

    weakMap = weakMap || new WeakMap();

    const oldSelectBlocks = this.getSelectedBlocks();

    this._range = newRange;
    this.caret.update(weakMap);
    // 更新目标列位置状态
    // 如果不是上下键导航，则更新目标列状态
    // 如果是上下键导航，则保持当前的目标列状态
    if (!isVerticalNavigation) {
      this.editor.updateTargetColumnX(weakMap);
    }
    // update selection
    updateSelection(this.editor, weakMap);

    // clear other block selection
    const selectBlocks = this.getSelectedBlocks().map((item) => item.block);
    const outerBlocks = oldSelectBlocks.filter((item) => !selectBlocks.includes(item.block));
    requestAnimationFrame(() => {
      outerBlocks.forEach((block) => {
        removeBackgrounds(block.block);
      });
    });

    // 只在非垂直导航时自动聚焦和滚动
    // 垂直导航的滚动由具体的 action 控制
    if (!isVerticalNavigation) {
      this.editor.focus(true, weakMap);
    } else {
      // 垂直导航时只聚焦，不滚动
      this.editor.focus(false, weakMap);
    }
    this.editor.emit('selectionChange');
    return this._range;
  }

  getSelectedBlocks() {
    return getRangeBlocks(this.editor, this._range);
  }
}
