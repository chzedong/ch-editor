import { Editor } from '../editor/editor';
import { getBlockIndex } from '../block/block-dom';
import { getContainerId, getParentContainer } from '../container/container-dom';
import { assert } from '../utils/assert';
import { splitToThree } from './text-op';
import { DocBlockTextActions } from '../index.type';
import AttributeMap from 'quill-delta/dist/AttributeMap';
import { updateSelection } from '../selection/selection-dom';
import { isTextKindBlock } from './text-block';

/**
 * 给选中的文本应用格式
 * @param editor 编辑器实例
 * @param attributes 要应用的属性
 */
export function formatSelectedText(editor: Editor, attributes: AttributeMap) {
  const { range } = editor.selection;

  // 如果是折叠选区，不执行格式化
  if (range.isCollapsed()) {
    return;
  }

  const selectedBlocks = editor.selection.getSelectedBlocks();
  selectedBlocks.forEach((selectedBlock) => {
    const { block, anchor: start, focus: end } = selectedBlock;

    if (!isTextKindBlock(editor, block)) {
      return;
    }

    const blockIndex = getBlockIndex(block);
    const container = getParentContainer(block);
    const containerId = getContainerId(container);
    const blockData = editor.getBlockData(block);

    assert(blockData.text, 'Block has no text');

    // 创建格式化操作
    const actions: DocBlockTextActions = [];

    // 保留开始位置之前的内容
    if (start > 0) {
      actions.push({ retain: start });
    }

    // 应用格式到选中的文本
    const selectedLength = end - start;
    if (selectedLength > 0) {
      actions.push({
        retain: selectedLength,
        attributes: attributes
      });
    }

    if (actions.length > 0) {
      editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);
    }
  });

  // 应用操作
  updateSelection(editor);
  editor.focus();
}

/**
 * 检查选中文本是否有指定格式
 * @param editor 编辑器实例
 * @param attributeKey 属性键
 * @param attributeValue 属性值（可选）
 * @returns
 */
export function hasTextFormat(editor: Editor, attributeKey: string, attributeValue: any = true) {
  const { range } = editor.selection;
  const { start, end } = range;

  const blockData = editor.editorDoc.getBlockById(start.blockId);

  assert(blockData.text, 'Block has no text');

  const { middle } = splitToThree(blockData.text, start.offset, end.offset - start.offset);

  // 简单检查：如果选中文本的第一个字符有该属性，则认为整个选区都有该属性
  const hasFormat = middle.length > 0 && middle[0].attributes && middle[0].attributes[attributeKey] === attributeValue;

  return hasFormat;
}

/**
 * 切换选中文本的格式（如果已有则移除，没有则添加）
 * @param editor 编辑器实例
 * @param attributeKey 属性键
 * @param attributeValue 属性值（可选）
 */
export function toggleTextFormat(editor: Editor, attributeKey: string, attributeValue: any = true) {
  const { range } = editor.selection;

  // 如果是折叠选区，不执行格式化
  if (range.isCollapsed()) {
    return;
  }

  // 简单检查：如果选中文本的第一个字符有该属性，则认为整个选区都有该属性
  const hasFormat = hasTextFormat(editor, attributeKey, attributeValue);

  if (hasFormat) {
    // 移除格式
    const attributes: AttributeMap = {};
    attributes[attributeKey] = null;
    formatSelectedText(editor, attributes);
  } else {
    // 添加格式
    const attributes: AttributeMap = {};
    attributes[attributeKey] = attributeValue;
    formatSelectedText(editor, attributes);
  }
}

/**
 * 使用Mark系统应用格式
 * @param editor 编辑器实例
 * @param markName Mark名称
 * @param params Mark参数（可选）
 */
export function applyMarkToSelection(editor: Editor, markName: string, params?: any) {
  try {
    const attributes = editor.markManager.createMarkAttributes(markName, params);
    formatSelectedText(editor, attributes);
  } catch (error) {
    console.error(`Failed to apply mark '${markName}':`, error);
  }
}

/**
 * 切换Mark格式
 * @param editor 编辑器实例
 * @param markName Mark名称
 * @param params Mark参数（可选）
 */
export function toggleMark(editor: Editor, markName: string, params?: any) {
  try {
    const mark = editor.markManager.getMark(markName);
    if (!mark) {
      console.error(`Mark '${markName}' not found`);
      return;
    }

    const attributes = mark.createAttributes(params);
    const attributeKey = Object.keys(attributes)[0];
    const attributeValue = attributes[attributeKey];

    toggleTextFormat(editor, attributeKey, attributeValue);
  } catch (error) {
    console.error(`Failed to toggle mark '${markName}':`, error);
  }
}
