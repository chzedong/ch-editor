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
    // 更新选区状态
    this._range = newRange;

    // 执行渲染逻辑
    this.renderSelection(oldSelectBlocks, isVerticalNavigation, weakMap);

    this.editor.emit('selectionChange');
    return this._range;
  }

  /**
   * 渲染选区相关的视觉效果
   * @param oldSelectBlocks 之前选中的块
   * @param isVerticalNavigation 是否为垂直导航
   * @param weakMap LineBreaker缓存
   */
  renderSelection(oldSelectBlocks: any[], isVerticalNavigation?: boolean, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    // 更新光标位置
    this.caret.update(weakMap);

    // 更新目标列位置状态
    if (!isVerticalNavigation) {
      this.editor.updateTargetColumnX(weakMap);
    }

    // 更新选区渲染
    updateSelection(this.editor, weakMap);

    // 清理旧的选区背景
    const selectBlocks = this.getSelectedBlocks().map((item) => item.block);
    const outerBlocks = oldSelectBlocks.filter((item) => !selectBlocks.includes(item.block));
    requestAnimationFrame(() => {
      outerBlocks.forEach((block) => {
        removeBackgrounds(block.block);
      });
    });

    // 只在非垂直导航时自动聚焦和滚动
    // 垂直导航的滚动由具体的 action 控制
    this.editor.focus(!isVerticalNavigation, weakMap);
  }

  getSelectedBlocks() {
    return getRangeBlocks(this.editor, this._range);
  }
}
