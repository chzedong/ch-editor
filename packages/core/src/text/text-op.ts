import { DocBlockAttributes, DocBlockTextActionOp, DocBlockTextActions } from '../index.type';

export function createInsertOp(offset: number, text: string, attributes: DocBlockAttributes | null) {
  if (text.length === 0) {
    return [];
  }

  const ops = [];
  if (offset > 0) {
    ops.push({
      retain: offset
    });
  }

  const newText = text.replaceAll('\r\n', ' ').replaceAll('\n', ' ').replaceAll('\r', ' ');
  const textOp: DocBlockTextActionOp = {
    insert: newText
  };
  if (attributes) {
    textOp.attributes = attributes;
  }
  ops.push(textOp);

  return ops;
}

/**
 * 构造删除操作的工具函数
 * @param startOffset 开始位置偏移量
 * @param deleteLength 删除长度
 * @returns 删除操作数组
 */
export function createDeleteActions(startOffset: number, deleteLength: number): DocBlockTextActions {
  const actions: DocBlockTextActions = [];
  if (startOffset > 0) {
    actions.push({ retain: startOffset });
  }
  if (deleteLength > 0) {
    actions.push({ delete: deleteLength });
  }
  return actions;
}

