import { assert } from '../utils/assert';
import { Editor } from '../editor/editor';
import { getBlockType, getParentBlock } from '../block/block-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { editorGetPreWordStart } from '../editor/actions/move-word-left';
import { editorGetNextWordEnd } from '../editor/actions/move-word-right';
import { isTextKindBlock } from '../editor/editor-blocks';

export class RootContainer {
  constructor(private editor: Editor, public rootContainer: HTMLElement) {
    rootContainer.addEventListener('mousedown', this.handleMouseDown);
    rootContainer.addEventListener('dblclick', this.handleDoubleClick);
  }

  handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const { clientX, clientY } = e;

    this.editor.focus();

    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);
    if (!block) {
      // TODO:计算padding区域，重新矫正x, y

      return;
    }
    const type = block.getAttribute('data-block-type');
    assert(type, 'no type');
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const pos = blockClass.getRangeFormPoint(block, clientX, clientY);
    const endPos = new EditorBlockPosition(block.id, pos.offset, pos.type);
    this.editor.selection.setSelection(pos, endPos);
  };

  handleDoubleClick = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);

    if (!block) {
      return;
    }

    // 检查是否为文本类型的块
    if (!isTextKindBlock(this.editor, block)) {
      return;
    }

    const type = getBlockType(block);
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const pos = blockClass.getRangeFormPoint(block, clientX, clientY);

    // 获取块的文本数据
    const blockData = this.editor.getBlockData(block);
    const blockLen = blockClass.getBlockTextLength(block);
    const currentOffset = pos.offset;

    assert(blockData.text, 'no text');
    // 使用分词算法找到单词的开始和结束位置
    let wordStart = editorGetPreWordStart(blockData.text, currentOffset);
    let wordEnd = editorGetNextWordEnd(blockData.text, currentOffset, blockLen);

    // 处理边界情况
    if (wordStart === -1) {
      wordStart = 0;
    }
    if (wordEnd === -1) {
      wordEnd = blockLen;
    }

    // 确保索引有效且形成有效选区
    assert(wordStart <= wordEnd, 'invalid range');
    assert(wordStart >= 0, 'invalid range');
    assert(wordEnd <= blockLen, 'invalid range');

    // 如果开始和结束位置相同，选择当前字符
    if (wordStart === wordEnd && wordEnd < blockLen) {
      wordEnd = wordStart + 1;
    }

    // 创建选区
    const startPos = new EditorBlockPosition(block.id, wordStart);
    const endPos = new EditorBlockPosition(block.id, wordEnd);

    // 设置选区
    this.editor.selection.setSelection(startPos, endPos);
  };

  destroy() {
    this.rootContainer.removeEventListener('click', this.handleMouseDown);
    this.rootContainer.removeEventListener('dblclick', this.handleDoubleClick);
  }
}
