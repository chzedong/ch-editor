import { DocBlock, DocBlockText, DocObject, DocBlockTextActionOp } from '@ch-editor/core';
import { YjsDocModel } from '../models/yjs-doc-model';
import { YjsProvider } from '../collaboration/yjs-provider';

export interface DocApiConfig {
  enableWebsocket?: boolean;
  websocketUrl?: string;
  roomName?: string;
}

export class DocApi {
  private docModel: YjsDocModel;
  private provider: YjsProvider;
  private selectedBlockId: string | null = null;

  constructor(config: DocApiConfig = {}) {
    this.docModel = new YjsDocModel();
    this.provider = new YjsProvider(this.docModel, {
      enableWebsocket: config.enableWebsocket || false,
      websocketUrl: config.websocketUrl || 'ws://localhost:1234',
      roomName: config.roomName || 'yjs-doc-demo',
      enableLocalStorage: true
    });
  }

  /**
   * 初始化并连接
   */
  async initialize(): Promise<void> {
    await this.provider.connect();

    // 如果文档为空，创建示例数据
    if (this.docModel.getBlockCount() === 0) {
      this.docModel.createSampleData();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.provider.disconnect();
  }

  // ==================== 文档级操作 ====================

  /**
   * 获取完整文档
   */
  getDocument(): DocObject {
    return this.docModel.toDocObject();
  }

  /**
   * 设置完整文档
   */
  setDocument(docObject: DocObject): void {
    this.docModel.fromDocObject(docObject);
  }

  /**
   * 清空文档
   */
  clearDocument(): void {
    this.docModel.clear();
    this.selectedBlockId = null;
  }

  /**
   * 获取文档统计信息
   */
  getDocumentStats() {
    return this.provider.getDocumentStats();
  }

  // ==================== 块级操作 ====================

  /**
   * 获取所有块
   */
  getAllBlocks(): DocBlock[] {
    return this.docModel.getAllBlocks();
  }

  /**
   * 获取块数量
   */
  getBlockCount(): number {
    return this.docModel.getBlockCount();
  }

  /**
   * 根据ID获取块
   */
  getBlockById(id: string): DocBlock | null {
    return this.docModel.getBlockById(id);
  }

  /**
   * 添加新块
   */
  addBlock(type: string, content?: string, index?: number): string {
    const id = YjsDocModel.generateId();
    const block: DocBlock = {
      type,
      id,
      text: content ? [{ insert: content }] : []
    };

    // 根据类型设置特殊属性
    switch (type) {
    case 'heading':
      (block as any).level = 1;
      break;
    case 'embed':
      (block as any).embedType = 'code';
      (block as any).data = {
        language: 'javascript',
        code: content || 'console.log("Hello World");'
      };
      break;
    }

    this.docModel.addBlock(block, index);
    return id;
  }

  /**
   * 删除块
   */
  deleteBlock(id: string): boolean {
    if (this.selectedBlockId === id) {
      this.selectedBlockId = null;
    }
    return this.docModel.deleteBlockById(id);
  }

  /**
   * 更新块内容
   */
  updateBlockContent(id: string, content: string): boolean {
    const text: DocBlockText = [{ insert: content }];
    const index = this.docModel.findBlockIndexById(id);
    if (index !== -1) {
      return this.docModel.updateBlockText(index, text);
    }
    return false;
  }

  /**
   * 更新块属性
   */
  updateBlockAttributes(id: string, attributes: Record<string, any>): boolean {
    return this.docModel.updateBlockById(id, attributes);
  }

  /**
   * 移动块位置
   */
  moveBlock(id: string, newIndex: number): boolean {
    const block = this.getBlockById(id);
    if (!block) return false;

    const currentIndex = this.docModel.findBlockIndexById(id);
    if (currentIndex === -1) return false;

    // 删除原位置的块
    this.docModel.deleteBlock(currentIndex);

    // 在新位置插入块
    const adjustedIndex = newIndex > currentIndex ? newIndex - 1 : newIndex;
    this.docModel.addBlock(block, adjustedIndex);

    return true;
  }

  // ==================== 选择操作 ====================

  /**
   * 选择块
   */
  selectBlock(id: string): boolean {
    const block = this.getBlockById(id);
    if (block) {
      this.selectedBlockId = id;
      return true;
    }
    return false;
  }

  /**
   * 取消选择
   */
  clearSelection(): void {
    this.selectedBlockId = null;
  }

  /**
   * 获取当前选中的块ID
   */
  getSelectedBlockId(): string | null {
    return this.selectedBlockId;
  }

  /**
   * 获取当前选中的块
   */
  getSelectedBlock(): DocBlock | null {
    if (this.selectedBlockId) {
      return this.getBlockById(this.selectedBlockId);
    }
    return null;
  }

  // ==================== 文本操作 ====================

  /**
   * 获取块的纯文本内容
   */
  getBlockTextContent(id: string): string {
    const block = this.getBlockById(id);
    if (!block || !block.text) return '';

    return block.text.map(op => op.insert).join('');
  }

  /**
   * 在块中插入文本
   */
  insertTextInBlock(id: string, text: string, position?: number): boolean {
    const block = this.getBlockById(id);
    if (!block) return false;

    const currentText = this.getBlockTextContent(id);
    const insertPos = position !== undefined ? position : currentText.length;

    const newText = currentText.slice(0, insertPos) + text + currentText.slice(insertPos);
    return this.updateBlockContent(id, newText);
  }

  /**
   * 删除块中的文本
   */
  deleteTextInBlock(id: string, start: number, length: number): boolean {
    const block = this.getBlockById(id);
    if (!block) return false;

    const currentText = this.getBlockTextContent(id);
    const newText = currentText.slice(0, start) + currentText.slice(start + length);
    return this.updateBlockContent(id, newText);
  }

  // ==================== 协同功能 ====================

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.provider.getConnectionStatus();
  }

  /**
   * 监听连接状态变化
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    return this.provider.onConnectionChange(callback);
  }

  /**
   * 监听文档更新
   */
  onDocumentUpdate(callback: () => void): () => void {
    return this.provider.onDocumentUpdate(callback);
  }

  /**
   * 获取在线用户
   */
  getOnlineUsers() {
    return this.provider.getOnlineUsers();
  }

  /**
   * 设置当前用户信息
   */
  setCurrentUser(name: string, color: string): void {
    this.provider.setLocalUser({ name, color });
  }

  // ==================== 数据导入导出 ====================

  /**
   * 导出文档为JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.getDocument(), null, 2);
  }

  /**
   * 从JSON导入文档
   */
  importFromJson(json: string): boolean {
    try {
      const docObject = JSON.parse(json) as DocObject;
      this.setDocument(docObject);
      return true;
    } catch (error) {
      console.error('Failed to import from JSON:', error);
      return false;
    }
  }

  /**
   * 导出YJS状态
   */
  exportYjsState(): Uint8Array {
    return this.provider.exportDocument();
  }

  /**
   * 导入YJS状态
   */
  importYjsState(state: Uint8Array): void {
    this.provider.importDocument(state);
  }

  /**
   * 清除本地存储
   */
  clearLocalStorage(): void {
    this.provider.clearLocalStorage();
  }

  // ==================== 便捷方法 ====================

  /**
   * 创建段落块
   */
  addParagraph(content: string = '', index?: number): string {
    return this.addBlock('paragraph', content, index);
  }

  /**
   * 创建标题块
   */
  addHeading(content: string = '', level: number = 1, index?: number): string {
    const id = this.addBlock('heading', content, index);
    this.updateBlockAttributes(id, { level });
    return id;
  }

  /**
   * 创建嵌入块
   */
  addEmbed(embedType: string, data: Record<string, any>, index?: number): string {
    const id = this.addBlock('embed', '', index);
    this.updateBlockAttributes(id, { embedType, data });
    return id;
  }

  /**
   * 创建代码块
   */
  addCodeBlock(code: string = '', language: string = 'javascript', index?: number): string {
    return this.addEmbed('code', { language, code }, index);
  }

  /**
   * 获取文档的可视化表示
   */
  getDocumentVisualization(): string {
    const doc = this.getDocument();
    const stats = this.getDocumentStats();

    let result = '╔══════════════════════════════════════════════════════════════╗\n';
    result += '║                    YJS Document Visualization                ║\n';
    result += '╚══════════════════════════════════════════════════════════════╝\n\n';

    result += '📊 Document Statistics:\n';
    result += `   • Blocks Count: ${stats.blocksCount}\n`;
    result += `   • Document Size: ${stats.documentSize} bytes\n`;
    result += `   • Connection Status: ${stats.isConnected ? '🟢 Connected' : '🔴 Disconnected'}\n`;
    result += `   • Online Users: ${stats.onlineUsers}\n`;
    result += `   • WebSocket: ${stats.websocketEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n`;

    if (doc.blocks.length === 0) {
      result += '📝 No blocks found in the document.\n';
    } else {
      result += '📝 Document Blocks:\n';
      result += '─'.repeat(60) + '\n\n';

      doc.blocks.forEach((block, index) => {
        // 块标题
        result += `📄 Block #${index + 1}: ${block.type.toUpperCase()}\n`;
        result += `   ID: ${block.id}\n`;

        // 文本内容
        if (block.text && block.text.length > 0) {
          const content = block.text.map(op => op.insert).join('').trim();
          if (content) {
            result += '   📝 Content: ';
            if (content.length > 80) {
              result += `${content.substring(0, 80)}...\n`;
            } else {
              result += `${content}\n`;
            }

            // 显示文本操作数量
            result += `   📊 Text Operations: ${block.text.length}\n`;
          }
        } else {
          result += '   📝 Content: (empty)\n';
        }

        // 显示其他属性
        const otherProps = Object.entries(block).filter(([key]) =>
          !['type', 'id', 'text'].includes(key)
        );

        if (otherProps.length > 0) {
          result += '   🔧 Properties:\n';
          otherProps.forEach(([key, value]) => {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            result += `      • ${key}: ${valueStr}\n`;
          });
        }

        result += '\n' + '─'.repeat(60) + '\n\n';
      });
    }

    result += '✨ End of Document Visualization\n';
    return result;
  }

  /**
   * 对指定块执行增量文本操作
   */
  applyTextAction(blockIndex: number, action: DocBlockTextActionOp): boolean {
    return this.docModel.applyTextAction(blockIndex, action);
  }

  /**
   * 根据 ID 对块执行增量文本操作
   */
  applyTextActionById(blockId: string, action: DocBlockTextActionOp): boolean {
    return this.docModel.applyTextActionById(blockId, action);
  }

  /**
   * 在指定位置插入文本
   */
  insertText(blockId: string, position: number, text: string, attributes?: any): boolean {
    const action: DocBlockTextActionOp = {
      retain: position,
      insert: text,
      attributes
    };
    return this.applyTextActionById(blockId, action);
  }

  /**
   * 删除指定位置的文本
   */
  deleteText(blockId: string, position: number, length: number): boolean {
    const action: DocBlockTextActionOp = {
      retain: position,
      delete: length
    };
    return this.applyTextActionById(blockId, action);
  }

  /**
   * 格式化指定范围的文本
   */
  formatText(blockId: string, position: number, length: number, attributes: any): boolean {
    const action: DocBlockTextActionOp = {
      retain: position,
      attributes
    };
    return this.applyTextActionById(blockId, action);
  }
}
