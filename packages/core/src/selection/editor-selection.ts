import { Editor } from '../editor/editor';
import { EditorSelectionRange, SelectionRangeSnapshot } from './selection-range';
import { getRangeBlocks, updateSelection } from './selection-dom';
import { getBlockId, getBlockType } from '../block/block-dom';
import { Caret } from '../caret/caret-render';
import { EditorBlockPosition, SimpleBlockPositionType } from './block-position';
import { assert } from '../utils/assert';
import { LineBreaker } from '../text/line/text-line';
import { removeBackgrounds } from '../text/text-dom';

import { BlockElement } from '../index.type';

export class EditorSelection {
  readonly caret: Caret;

  _range: EditorSelectionRange;

  _selectedBlocks: Set<string> = new Set();

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
    const block = this.editor.editorDoc.getBlockById(pos.blockId);
    const type = block.type;
    const ok = pos.offset >= 0 && pos.offset <= this.editor.editorBlocks.getBlockClass(type).getBlockTextLength(block);
    assert(ok, 'invalid block position');
  }

  setSelection(
    anchor: EditorBlockPosition,
    focus: EditorBlockPosition,
    isVerticalNavigation?: boolean,
    weakMap?: WeakMap<BlockElement, LineBreaker>
  ) {
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
    // 更新选区状态
    this._range = newRange;

    // 执行渲染逻辑
    this.renderSelection(isVerticalNavigation, weakMap);

    this.editor.emit('selectionChange');
    return this._range;
  }

  /**
   * 渲染选区相关的视觉效果
   * @param isVerticalNavigation 是否为垂直导航
   * @param weakMap LineBreaker缓存
   */
  renderSelection(isVerticalNavigation?: boolean, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    // 更新光标位置
    this.caret.update(weakMap);

    // 更新目标列位置状态
    if (!isVerticalNavigation) {
      this.editor.updateTargetColumnX(weakMap);
    }

    // 更新选区渲染
    updateSelection(this.editor, weakMap);

    const oldSelectBlocks = [...this._selectedBlocks];
    // 清理旧的选区背景
    this._selectedBlocks.clear();
    const selectBlocks = this.getSelectedBlocks().map((item) => {
      const blockId = getBlockId(item.block);
      this._selectedBlocks.add(blockId);
      return blockId;
    });
    const outerBlocks = oldSelectBlocks.filter((item) => {
      return !selectBlocks.includes(item);
    });
    requestAnimationFrame(() => {
      outerBlocks.forEach((blockId) => {
        const block = this.editor.findBlockById(blockId);
        block && removeBackgrounds(block);
      });
    });

    // 只在非垂直导航时自动聚焦和滚动
    // 垂直导航的滚动由具体的 action 控制
    this.editor.focus(!isVerticalNavigation, weakMap);
  }

  getSelectedBlocks() {
    return getRangeBlocks(this.editor, this._range);
  }

  /**
   * 分析特定block在给定选区中的选中情况
   * @param editor 编辑器实例
   * @param blockId 目标block的ID
   * @param containerId 容器ID
   * @param range 选区实例
   * @returns 返回该block的选中范围，如果未选中则返回null
   */
  static patchBlockSelection(
    editor: Editor,
    blockId: string,
    containerId: string,
    range: EditorSelectionRange
  ): SelectionRangeSnapshot | null {
    const { start, end } = range;

    // 如果选区已折叠且不在目标block上，返回null
    if (range.isCollapsed() && start.blockId !== blockId) {
      return null;
    }

    // 获取目标block在容器中的索引
    const targetBlockIndex = editor.editorDoc.getBlockIndexById(containerId, blockId);
    if (targetBlockIndex === -1) {
      return null; // block不存在
    }

    // 获取选区起始和结束block的索引
    const startBlockIndex = editor.editorDoc.getBlockIndexById(containerId, start.blockId);
    const endBlockIndex = editor.editorDoc.getBlockIndexById(containerId, end.blockId);

    // 如果目标block不在选区范围内，返回null
    const minIndex = Math.min(startBlockIndex, endBlockIndex);
    const maxIndex = Math.max(startBlockIndex, endBlockIndex);
    if (targetBlockIndex < minIndex || targetBlockIndex > maxIndex) {
      return null;
    }

    // 获取目标block的文本长度
    const targetBlock = editor.getBlockById(blockId);
    const blockTextLength = editor.getBlockTextLength(targetBlock);

    // 计算该block的选中范围
    let anchor: number;
    let focus: number;

    if (start.blockId === blockId && end.blockId === blockId) {
      // 选区完全在目标block内
      anchor = start.offset;
      focus = end.offset;
    } else if (start.blockId === blockId) {
      // 选区从目标block开始
      anchor = start.offset;
      focus = blockTextLength;
    } else if (end.blockId === blockId) {
      // 选区在目标block结束
      anchor = 0;
      focus = end.offset;
    } else {
      // 目标block完全被选中
      anchor = 0;
      focus = blockTextLength;
    }

    // 确定position type
    const getPositionType = (offset: number): SimpleBlockPositionType => {
      if (range.isCollapsed()) return range.anchor.type;

      if (offset === 0) return 'home';
      if (offset === blockTextLength) return 'end';
      return 'middle';
    };

    return {
      anchor: {
        blockId,
        offset: anchor,
        type: getPositionType(anchor)
      },
      focus: {
        blockId,
        offset: focus,
        type: getPositionType(focus)
      }
    };
  }
}
