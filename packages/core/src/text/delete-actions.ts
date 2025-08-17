import { DocBlockTextActions } from '../index.type';

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