import { Editor } from '../editor/editor';
import { getBlockId } from '../block/block-dom';
import { EditorBlockPosition } from '../selection/block-position';
import { createElement } from '../utils/dom';
import './embed.scss';

import { Block, BlockElement, BlockPath, DocBlock, DocEmbedBlock } from '../index.type';

function createBlockContent(editor: Editor, path: BlockPath, container: Element, blockElement: Element, blockData: DocBlock) {
  const embedData = blockData as DocEmbedBlock;
  const content = createElement('div', ['embed-content'], null) as HTMLElement;
  content.setAttribute('data-type', 'block-content');
  content.setAttribute('data-embed-type', embedData.embedType);

  // 插件渲染委托
  const plugin = editor.editorEmbeds.get(embedData.embedType);
  if (plugin) {
    const created = plugin.create({
      editor,
      path,
      blockElement: blockElement as BlockElement,
      data: embedData,
      contentRoot: content
    });
    if (created instanceof HTMLElement) {
      content.appendChild(created);
    }
  } else {
    // 回退占位
    const contentDisplay = createElement('div', ['embed-display'], null);
    contentDisplay.textContent = `No plugin for embed: ${embedData.embedType}`;
    contentDisplay.style.textAlign = 'center';
    contentDisplay.style.color = '#666';
    content.appendChild(contentDisplay);
  }

  if (blockElement) {
    blockElement.appendChild(content);
  }

  return content;
}

function updateBlock(editor: Editor, block: BlockElement, blockData: DocBlock) {
  const embedData = blockData as DocEmbedBlock;
  const content = block.querySelector('[data-type="block-content"]') as HTMLElement | null;
  const plugin = editor.editorEmbeds.get(embedData.embedType);
  if (plugin && content) {
    plugin.update?.({
      editor,
      path: [],
      blockElement: block,
      data: embedData,
      contentRoot: content
    });
  }
}

function getBlockTextLength(block: DocBlock) {
  // embed块作为原子块，长度固定为1
  return 1;
}

function getRangeFormPoint(editor: Editor, block: BlockElement, x: number, y: number) {
  // embed块只支持在开始或结束位置
  const blockId = getBlockId(block);
  const rect = block.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;

  // 根据点击位置决定光标位置：左半部分为0，右半部分为1
  const offset = x < centerX ? 0 : 1;
  return new EditorBlockPosition(blockId, offset, offset === 0 ? 'home' : 'end');
}

function getCursorRect(editor: Editor, block: BlockElement, position: EditorBlockPosition) {
  const rect = block.getBoundingClientRect();

  // 根据offset决定光标位置
  if (position.offset === 0) {
    // 光标在块的开始位置
    return new DOMRect(rect.left, rect.top, 2, rect.height);
  } else {
    // 光标在块的结束位置
    return new DOMRect(rect.right, rect.top, 2, rect.height);
  }
}

function updateSelection(editor: Editor, block: BlockElement, from: number, to: number) {
  if (from === -1 && to === -1) {
    // 恢复默认样式
    block.classList.remove('selected');
  } else {
    // 整个块被选中
    block.classList.add('selected');
  }
}

function deleteBlock(editor: Editor, block: BlockElement) {
  // 删除embed块，先通知插件清理
  const content = block.querySelector('[data-type="block-content"]') as HTMLElement | null;
  const blockData = editor.getBlockData(block) as DocEmbedBlock;
  const plugin = editor.editorEmbeds.get(blockData.embedType);
  if (plugin && content) {
    plugin.destroy?.({
      editor,
      path: [],
      blockElement: block,
      data: blockData,
      contentRoot: content
    });
  }
  block.remove();
}

const EmbedBlock: Block = {
  blockKing: 'embed',
  blockType: 'embed',
  createBlockContent,
  updateBlock,
  getBlockTextLength,
  getRangeFormPoint,
  updateSelection,
  getCursorRect,
  deleteBlock
};

export default EmbedBlock;


