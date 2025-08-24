import AttributeMap from 'quill-delta/dist/AttributeMap';
import { BoxData, DocBlockTextOp, DocBlockTextOpWithBox } from '../index.type';

/**
 * 判断是否为 box 操作
 */
export function isBoxOp(op: DocBlockTextOp | DocBlockTextOpWithBox): op is DocBlockTextOpWithBox {
  return 'insertBox' in op && op.insertBox !== undefined;
}

/**
 * 判断是否为文本操作
 */
export function isTextOp(op: DocBlockTextOp | DocBlockTextOpWithBox): op is DocBlockTextOp {
  return 'insert' in op && typeof op.insert === 'string' && !isBoxOp(op);
}

/**
 * 创建 box 插入操作
 */
export function createBoxInsertOp(boxData: BoxData, attributes?: AttributeMap): DocBlockTextOpWithBox {
  const op: DocBlockTextOpWithBox = {
    insertBox: boxData,
    insert: '\u200b'
  };

  if (attributes) {
    op.attributes = attributes;
  }

  return op;
}

