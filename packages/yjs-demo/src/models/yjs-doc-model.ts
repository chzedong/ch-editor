import * as Y from 'yjs';
import { DocObject, DocBlock, DocBlockText, DocBlockTextOp, DocBlockTextActionOp } from '@ch-editor/core';

/**
 * YJS 版本的 DocObject 模型
 * 使用 Y.Array 存储 blocks，每个 block 使用 Y.Map 存储属性
 */
export class YjsDocModel {
  public readonly ydoc: Y.Doc;
  public readonly blocks: Y.Array<Y.Map<any>>;

  constructor(docName: string = 'doc') {
    this.ydoc = new Y.Doc();
    this.blocks = this.ydoc.getArray<Y.Map<any>>('blocks');
  }

  /**
   * 将普通的 DocObject 转换为 YJS 结构
   */
  fromDocObject(docObject: DocObject): void {
    // 清空现有数据
    this.blocks.delete(0, this.blocks.length);

    // 添加所有 blocks
    docObject.blocks.forEach((block) => {
      this.addBlock(block);
    });
  }

  /**
   * 将 YJS 结构转换为普通的 DocObject
   */
  toDocObject(): DocObject {
    const blocks: DocBlock[] = [];

    this.blocks.forEach((blockMap) => {
      const block = this.mapToDocBlock(blockMap);
      if (block) {
        blocks.push(block);
      }
    });

    return { blocks };
  }

  /**
   * 添加一个新的 block
   */
  addBlock(block: DocBlock, index?: number): void {
    const blockMap = this.docBlockToMap(block);

    if (index !== undefined && index >= 0 && index <= this.blocks.length) {
      this.blocks.insert(index, [blockMap]);
    } else {
      this.blocks.push([blockMap]);
    }
  }

  /**
   * 删除指定索引的 block
   */
  deleteBlock(index: number): boolean {
    if (index >= 0 && index < this.blocks.length) {
      this.blocks.delete(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 根据 ID 删除 block
   */
  deleteBlockById(id: string): boolean {
    const index = this.findBlockIndexById(id);
    if (index !== -1) {
      return this.deleteBlock(index);
    }
    return false;
  }

  /**
   * 更新指定索引的 block
   */
  updateBlock(index: number, block: Partial<DocBlock>): boolean {
    if (index >= 0 && index < this.blocks.length) {
      const blockMap = this.blocks.get(index);

      // 更新 block 的属性
      Object.entries(block).forEach(([key, value]) => {
        if (key === 'text') {
          blockMap.set(key, this.docBlockTextToYText(value as DocBlockText));
        } else {
          blockMap.set(key, value);
        }
      });

      return true;
    }
    return false;
  }

  /**
   * 根据 ID 更新 block
   */
  updateBlockById(id: string, block: Partial<DocBlock>): boolean {
    const index = this.findBlockIndexById(id);
    if (index !== -1) {
      return this.updateBlock(index, block);
    }
    return false;
  }

  /**
   * 更新 block 的文本内容（全量替换）
   */
  updateBlockText(index: number, text: DocBlockText): boolean {
    if (index >= 0 && index < this.blocks.length) {
      const blockMap = this.blocks.get(index);

      // 使用 Y.Text
      blockMap.set('text', this.docBlockTextToYText(text));

      return true;
    }
    return false;
  }

  /**
   * 对 block 的文本内容执行增量操作
   */
  applyTextAction(index: number, action: DocBlockTextActionOp): boolean {
    if (index < 0 || index >= this.blocks.length) {
      return false;
    }

    const blockMap = this.blocks.get(index);
    return this.applyTextActionToYText(blockMap, action);
  }

  /**
   * 根据 ID 对 block 的文本内容执行增量操作
   */
  applyTextActionById(id: string, action: DocBlockTextActionOp): boolean {
    const index = this.findBlockIndexById(id);
    if (index !== -1) {
      return this.applyTextAction(index, action);
    }
    return false;
  }

  /**
   * 对 Y.Text 类型执行增量操作
   */
  private applyTextActionToYText(blockMap: Y.Map<any>, action: DocBlockTextActionOp): boolean {
    const yText = blockMap.get('text') as Y.Text;
    if (!yText) {
      return false;
    }

    try {
      if (action.insert !== undefined) {
        // 插入操作
        const position = action.retain || 0;
        yText.insert(position, action.insert, action.attributes);
      } else if (action.delete !== undefined) {
        // 删除操作
        const position = action.retain || 0;
        yText.delete(position, action.delete);
      } else if (action.retain !== undefined && action.attributes) {
        // 格式化操作
        yText.format(action.retain, action.retain, action.attributes);
      }
      return true;
    } catch (error) {
      console.error('Error applying text action to Y.Text:', error);
      return false;
    }
  }

  /**
   * 根据 ID 查找 block 索引
   */
  findBlockIndexById(id: string): number {
    for (let i = 0; i < this.blocks.length; i++) {
      const blockMap = this.blocks.get(i);
      if (blockMap.get('id') === id) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 根据 ID 获取 block
   */
  getBlockById(id: string): DocBlock | null {
    const index = this.findBlockIndexById(id);
    if (index !== -1) {
      const blockMap = this.blocks.get(index);
      return this.mapToDocBlock(blockMap);
    }
    return null;
  }

  /**
   * 获取所有 blocks
   */
  getAllBlocks(): DocBlock[] {
    return this.toDocObject().blocks;
  }

  /**
   * 获取 blocks 数量
   */
  getBlockCount(): number {
    return this.blocks.length;
  }

  /**
   * 清空所有 blocks
   */
  clear(): void {
    this.blocks.delete(0, this.blocks.length);
  }

  /**
   * 将 DocBlock 转换为 Y.Map
   * 根据不同场景选择最合适的YJS数据类型
   */
  private docBlockToMap(block: DocBlock): Y.Map<any> {
    const map = new Y.Map<any>();

    Object.entries(block).forEach(([key, value]) => {
      if (key === 'text' && Array.isArray(value)) {
        // 根据文本内容复杂度选择合适的YJS类型
        const textContent = value as DocBlockText;

        // 使用 Y.Text - 适合协同文本编辑
        map.set(key, this.docBlockTextToYText(textContent));
      } else {
        map.set(key, value);
      }
    });

    return map;
  }

  /**
   * 将 Y.Map 转换为 DocBlock
   */
  private mapToDocBlock(map: Y.Map<any>): DocBlock | null {
    try {
      const block: any = {};

      map.forEach((value, key) => {
        if (key === 'text') {
          if (value instanceof Y.Text) {
            // 处理 Y.Text 类型
            block[key] = this.yTextToDocBlockText(value);
          } else {
            // 兜底处理：直接使用原值
            block[key] = value;
          }
        } else {
          // 跳过内部标记字段
          block[key] = value;
        }
      });

      // 确保必要的字段存在
      if (!block.type || !block.id) {
        return null;
      }

      return block as DocBlock;
    } catch (error) {
      console.error('Error converting map to DocBlock:', error);
      return null;
    }
  }

  /**
   * 将 DocBlockText 转换为 Y.Text (更适合协同文本编辑)
   * Y.Text 专门为文本协同编辑设计，支持字符级别的操作
   */
  private docBlockTextToYText(text: DocBlockText): Y.Text {
    const yText = new Y.Text();

    // 将 DocBlockTextOp 数组转换为 Y.Text
    let currentIndex = 0;
    for (const op of text) {
      if (typeof op.insert === 'string') {
        yText.insert(currentIndex, op.insert, op.attributes || {});
        currentIndex += op.insert.length;
      }
    }

    return yText;
  }

  /**
   * 将 Y.Text 转换回 DocBlockText
   */
  private yTextToDocBlockText(yText: Y.Text): DocBlockText {
    const result: DocBlockText = [];

    // 遍历 Y.Text 的所有格式化片段
    yText.toDelta().forEach((op: any) => {
      if (op.insert) {
        const textOp: DocBlockTextOp = {
          insert: op.insert
        };
        if (op.attributes && Object.keys(op.attributes).length > 0) {
          textOp.attributes = op.attributes;
        }
        result.push(textOp);
      }
    });

    return result.length > 0 ? result : [{ insert: '' }];
  }

  /**
   * 将 DocBlockTextOp 转换为 Y.Map (保留原方法作为备选)
   * 适用于需要精确控制每个操作的场景
   */
  private textOpToMap(op: DocBlockTextOp): Y.Map<any> {
    const map = new Y.Map<any>();
    map.set('insert', op.insert);
    if (op.attributes) {
      map.set('attributes', op.attributes);
    }
    return map;
  }

  /**
   * 生成唯一 ID
   */
  static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * 创建示例数据
   */
  createSampleData(): void {
    const sampleBlocks: DocBlock[] = [
      {
        type: 'heading',
        id: YjsDocModel.generateId(),
        level: 1,
        text: [{ insert: 'YJS DocObject 演示文档' }]
      },
      {
        type: 'paragraph',
        id: YjsDocModel.generateId(),
        text: [
          { insert: '这是一个基于 ' },
          { insert: 'YJS', attributes: { bold: true } },
          { insert: ' 的协同编辑演示。你可以在多个浏览器窗口中打开此页面，体验实时协同编辑功能。' }
        ]
      },
      {
        type: 'paragraph',
        id: YjsDocModel.generateId(),
        text: [{ insert: '支持的功能包括：' }]
      },
      {
        type: 'paragraph',
        id: YjsDocModel.generateId(),
        text: [{ insert: '• 实时协同编辑\n• 数据可视化\n• 块级操作\n• 文本格式化' }]
      },
      {
        type: 'embed',
        id: YjsDocModel.generateId(),
        embedType: 'code',
        data: {
          language: 'typescript',
          code: 'const doc = new Y.Doc();\nconst blocks = doc.getArray("blocks");'
        }
      }
    ];

    this.fromDocObject({ blocks: sampleBlocks });
  }
}
