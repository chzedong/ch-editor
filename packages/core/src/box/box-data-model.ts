import { BoxAttributeMap, BoxData, DocBlockTextOp } from '../index.type';

/**
 * 判断是否为 box 操作
 */
export function isBoxOp(op: DocBlockTextOp) : op is DocBlockTextOp & { attributes: BoxAttributeMap } {
  return op.attributes?.insertBox !== undefined;
}

/**
 * 判断是否为文本操作
 */
export function isTextOp(op: DocBlockTextOp) {
  return 'insert' in op && typeof op.insert === 'string' && !isBoxOp(op);
}

/**
 * 创建 box 插入操作
 */
export function createBoxInsertOp(boxData: BoxData): DocBlockTextOp {
  const op: DocBlockTextOp = {
    attributes: { insertBox: boxData },
    insert: '\u200b'
  };

  return op;
}

