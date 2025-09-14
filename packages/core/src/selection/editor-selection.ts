import { Editor } from '../editor/editor';
import { EditorSelectionRange, SelectionRangeSnapshot } from './selection-range';
import { getRangeBlocks, updateSelection } from './selection-dom';
import { getBlockId } from '../block/block-dom';
import { Caret } from '../caret/caret-render';
import { EditorBlockPosition, SimpleBlockPositionType } from './block-position';
import { assert } from '../utils/assert';
import { LineBreaker } from '../text/line/text-line';
import { removeBackgrounds } from '../text/text-dom';

import { BlockElement } from '../index.type';
import { isEmbedKindBlock } from '../embed/embed-utils';

export class EditorSelection {
  readonly caret: Caret;

  _range: EditorSelectionRange;

  _selectedBlocks: Set<string> = new Set();

  private _rafId: number | null = null;
  private _domOperations: (() => void)[] = [];

  constructor(private editor: Editor) {
    this.caret = new Caret(this.editor);
    const block = editor.editorDoc.getBlockByIndex('root', 0);
    const pos = new EditorBlockPosition(block.id, 0);
    this._range = new EditorSelectionRange(editor, { anchor: pos, focus: pos });

    setTimeout(() => {
      this.renderSelection();
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
    options?: {
      isVerticalNavigation?: boolean;
      weakMap?: WeakMap<BlockElement, LineBreaker>;
      syncRender?: boolean;
    }
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

    const isVerticalNavigation = options?.isVerticalNavigation;
    const weakMap = options?.weakMap || new WeakMap();
    const syncRender = options?.syncRender ?? true;
    // 更新选区状态
    this._range = newRange;

    // 执行渲染逻辑
    if (syncRender) {
      this.renderSelection(isVerticalNavigation, weakMap);
    } else {
      this.renderSelectionAsync(isVerticalNavigation);
    }

    this.editor.emit('selectionChange', this.editor);
    return this._range;
  }

  /**
   * 渲染选区相关的视觉效果
   * @param isVerticalNavigation 是否为垂直导航
   * @param weakMap LineBreaker缓存
   */
  renderSelection(isVerticalNavigation?: boolean, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    this.performRenderSelection(isVerticalNavigation, weakMap);
    // 批量执行收集到的DOM操作
    this._domOperations.forEach(op => op());
    this._domOperations = [];
  }

  /**
   * 异步渲染选区相关的视觉效果
   * @param isVerticalNavigation 是否为垂直导航
   */
  renderSelectionAsync(isVerticalNavigation?: boolean) {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
    }

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      // 执行渲染逻辑，此时所有DOM操作会被收集
      this.performRenderSelection(isVerticalNavigation, new WeakMap());
      // 批量执行收集到的DOM操作
      this._domOperations.forEach(op => op());
      this._domOperations = [];
    });
  }

  /**
   * 执行选区渲染的核心逻辑
   * @param isVerticalNavigation 是否为垂直导航
   * @param weakMap LineBreaker缓存（可选）
   */
  private performRenderSelection(isVerticalNavigation?: boolean, weakMap?: WeakMap<BlockElement, LineBreaker>) {
    // 更新光标位置
    this.caret.update(weakMap);

    // 更新目标列位置状态
    if (!isVerticalNavigation) {
      this.editor.updateTargetColumnX(weakMap);
    }

    // 更新选区渲染
    updateSelection(this.editor, weakMap);

    // 处理选中块的背景清理
    this.updateSelectedBlocksBackground();

    // 只在非垂直导航时自动聚焦和滚动
    // 垂直导航的滚动由具体的 action 控制
    this.editor.focus(!isVerticalNavigation, weakMap);
  }

  /**
   * 更新选中块的背景状态
   */
  private updateSelectedBlocksBackground() {
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
    this.scheduleDomOperation(() => {
      outerBlocks.forEach((blockId) => {
        const block = this.editor.findBlockById(blockId);
        block && removeBackgrounds(block);
      });
    });
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

    // 检查是否为embed块，embed块长度固定为1
    const isEmbedBlock = isEmbedKindBlock(editor, targetBlock);
    if (isEmbedBlock && blockTextLength !== 1) {
      console.warn('Embed block text length should be 1, but got:', blockTextLength);
    }

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

      // 对于embed块，只有home和end两种状态
      if (isEmbedBlock) {
        return offset === 0 ? 'home' : 'end';
      }

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

  /**
   * 调度DOM操作，如果当前处于异步渲染模式则收集操作，否则立即执行
   * @param operation DOM操作函数
   */
  scheduleDomOperation(operation: () => void) {
    this._domOperations.push(operation);
  }

  /**
   * 清理资源，取消未完成的异步渲染任务
   */
  destroy() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._domOperations = [];
    this._selectedBlocks.clear();
  }
}
