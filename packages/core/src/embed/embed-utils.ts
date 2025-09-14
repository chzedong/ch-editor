import { BlockElement, DocEmbedBlock } from '../index.type';
import { Editor } from '../editor/editor';
import { genId } from '../utils/get-id';

// 工具函数：判断是否为embed类型的块
export function isEmbedKindBlock(editor: Editor, block: BlockElement) {
  const blockData = editor.getBlockData(block);
  return editor.editorBlocks.getBlockClass(blockData.type).blockKing === 'embed';
}

// 工具函数：创建embed块数据
export function createEmbedBlockData(type: string, data: Record<string, any>): DocEmbedBlock {
  return {
    type: 'embed',
    embedType: type,
    id: genId(),
    data
  };
};
