import { DocApi } from './api/doc-api';

class YjsDemo {
  private docApi: DocApi;
  private isInitialized = false;

  // DOM 元素
  private connectionStatus!: HTMLElement;
  private connectBtn!: HTMLButtonElement;
  private disconnectBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private blockTypeSelect!: HTMLSelectElement;
  private addBlockBtn!: HTMLButtonElement;
  private blockContentTextarea!: HTMLTextAreaElement;
  private updateContentBtn!: HTMLButtonElement;
  private selectedBlockIdInput!: HTMLInputElement;
  private deleteBlockBtn!: HTMLButtonElement;
  private docVisualization!: HTMLElement;
  private docStructure!: HTMLElement;

  // 增量操作相关元素
  private insertTextBtn!: HTMLButtonElement;
  private deleteTextBtn!: HTMLButtonElement;
  private formatTextBtn!: HTMLButtonElement;
  private targetBlockIdInsertInput!: HTMLInputElement;
  private textPositionInsertInput!: HTMLInputElement;
  private insertContentInput!: HTMLInputElement;
  private targetBlockIdDeleteInput!: HTMLInputElement;
  private textPositionDeleteInput!: HTMLInputElement;
  private deleteLengthInput!: HTMLInputElement;
  private targetBlockIdFormatInput!: HTMLInputElement;
  private textPositionFormatInput!: HTMLInputElement;
  private formatLengthInput!: HTMLInputElement;

  constructor() {
    this.docApi = new DocApi({
      enableWebsocket: false, // 默认关闭WebSocket，使用本地模式
      roomName: 'yjs-demo-room'
    });

    window.docApi = this.docApi;

    this.initializeDOM();
    this.setupEventListeners();
    this.initialize();
  }

  private initializeDOM(): void {
    // 获取DOM元素
    this.connectionStatus = document.getElementById('connection-status')!;
    this.connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
    this.disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.blockTypeSelect = document.getElementById('block-type') as HTMLSelectElement;
    this.addBlockBtn = document.getElementById('add-block-btn') as HTMLButtonElement;
    this.blockContentTextarea = document.getElementById('block-content') as HTMLTextAreaElement;
    this.updateContentBtn = document.getElementById('update-content-btn') as HTMLButtonElement;
    this.selectedBlockIdInput = document.getElementById('selected-block-id') as HTMLInputElement;
    this.deleteBlockBtn = document.getElementById('delete-block-btn') as HTMLButtonElement;
    this.docVisualization = document.getElementById('doc-visualization')!;
    this.docStructure = document.getElementById('doc-structure')!;

    // 增量操作相关元素
    this.insertTextBtn = document.getElementById('insert-text-btn') as HTMLButtonElement;
    this.deleteTextBtn = document.getElementById('delete-text-btn') as HTMLButtonElement;
    this.formatTextBtn = document.getElementById('format-text-btn') as HTMLButtonElement;
    this.targetBlockIdInsertInput = document.getElementById('target-block-id-insert') as HTMLInputElement;
    this.textPositionInsertInput = document.getElementById('text-position-insert') as HTMLInputElement;
    this.insertContentInput = document.getElementById('insert-content') as HTMLInputElement;
    this.targetBlockIdDeleteInput = document.getElementById('target-block-id-delete') as HTMLInputElement;
    this.textPositionDeleteInput = document.getElementById('text-position-delete') as HTMLInputElement;
    this.deleteLengthInput = document.getElementById('delete-length') as HTMLInputElement;
    this.targetBlockIdFormatInput = document.getElementById('target-block-id-format') as HTMLInputElement;
    this.textPositionFormatInput = document.getElementById('text-position-format') as HTMLInputElement;
    this.formatLengthInput = document.getElementById('format-length') as HTMLInputElement;

  }

  private setupEventListeners(): void {
    // 连接控制
    this.connectBtn.addEventListener('click', () => this.connect());
    this.disconnectBtn.addEventListener('click', () => this.disconnect());
    this.clearBtn.addEventListener('click', () => this.clearDocument());

    // 块操作
    this.addBlockBtn.addEventListener('click', () => this.addBlock());
    this.updateContentBtn.addEventListener('click', () => this.updateSelectedBlockContent());
    this.deleteBlockBtn.addEventListener('click', () => this.deleteSelectedBlock());

    // 监听文档更新
    this.docApi.onDocumentUpdate(() => {
      this.updateVisualization();
      this.updateDocumentStructure();
    });

    // 监听连接状态变化
    this.docApi.onConnectionChange((connected) => {
      this.updateConnectionStatus(connected);
    });

    this.insertTextBtn.addEventListener('click', () => this.insertText());
    this.deleteTextBtn.addEventListener('click', () => this.deleteText());
    this.formatTextBtn.addEventListener('click', () => this.formatText());

    // 标签页切换功能
    this.setupTabSwitching();
  }

  // 标签页切换功能
  private setupTabSwitching(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = (button as HTMLElement).dataset.tab;

        // 移除所有活动状态
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // 添加当前活动状态
        button.classList.add('active');
        const targetContent = document.getElementById(`${targetTab}-tab`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  private async initialize(): Promise<void> {
    try {
      await this.docApi.initialize();
      this.isInitialized = true;
      this.updateVisualization();
      this.updateDocumentStructure();
      this.updateConnectionStatus(this.docApi.isConnected());

      console.log('YJS Demo initialized successfully');
    } catch (error) {
      console.error('Failed to initialize YJS Demo:', error);
      this.showError('初始化失败: ' + (error as Error).message);
    }
  }

  private async connect(): Promise<void> {
    try {
      await this.docApi.initialize();
      this.updateConnectionStatus(this.docApi.isConnected());
      this.showSuccess('连接成功');
    } catch (error) {
      console.error('Connection failed:', error);
      this.showError('连接失败: ' + (error as Error).message);
    }
  }

  private disconnect(): void {
    this.docApi.disconnect();
    this.updateConnectionStatus(false);
    this.showInfo('已断开连接');
  }

  private clearDocument(): void {
    if (confirm('确定要清空整个文档吗？此操作不可撤销。')) {
      this.docApi.clearDocument();
      this.selectedBlockIdInput.value = '';
      this.blockContentTextarea.value = '';
      this.showInfo('文档已清空');
    }
  }

  private addBlock(): void {
    const type = this.blockTypeSelect.value;
    const content = this.blockContentTextarea.value.trim();

    let blockId: string;

    switch (type) {
    case 'heading':
      blockId = this.docApi.addHeading(content || '新标题', 1);
      break;
    case 'embed':
      blockId = this.docApi.addCodeBlock(content || 'console.log("Hello World");', 'javascript');
      break;
    default:
      blockId = this.docApi.addParagraph(content || '新段落');
      break;
    }

    // 自动选择新创建的块
    this.selectBlock(blockId);
    this.blockContentTextarea.value = '';

    this.showSuccess(`已添加 ${type} 块`);
  }

  private updateSelectedBlockContent(): void {
    const selectedId = this.docApi.getSelectedBlockId();
    if (!selectedId) {
      this.showError('请先选择一个块');
      return;
    }

    const content = this.blockContentTextarea.value;
    if (this.docApi.updateBlockContent(selectedId, content)) {
      this.showSuccess('块内容已更新');
    } else {
      this.showError('更新失败');
    }
  }

  private deleteSelectedBlock(): void {
    const selectedId = this.docApi.getSelectedBlockId();
    if (!selectedId) {
      this.showError('请先选择一个块');
      return;
    }

    if (confirm('确定要删除选中的块吗？')) {
      if (this.docApi.deleteBlock(selectedId)) {
        this.selectedBlockIdInput.value = '';
        this.blockContentTextarea.value = '';
        this.showSuccess('块已删除');
      } else {
        this.showError('删除失败');
      }
    }
  }

  private selectBlock(id: string): void {
    if (this.docApi.selectBlock(id)) {
      this.selectedBlockIdInput.value = id;

      // 更新内容文本框
      const content = this.docApi.getBlockTextContent(id);
      this.blockContentTextarea.value = content;

      // 高亮显示选中的块
      this.highlightSelectedBlock(id);
    }
  }

  private highlightSelectedBlock(id: string): void {
    // 移除之前的高亮
    document.querySelectorAll('.block-item.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // 添加新的高亮
    const blockElement = document.querySelector(`[data-block-id="${id}"]`);
    if (blockElement) {
      blockElement.classList.add('selected');
    }
  }

  private updateConnectionStatus(connected: boolean): void {
    if (connected) {
      this.connectionStatus.textContent = '状态: 已连接';
      this.connectionStatus.className = 'status connected';
      this.connectBtn.disabled = true;
      this.disconnectBtn.disabled = false;
    } else {
      this.connectionStatus.textContent = '状态: 未连接';
      this.connectionStatus.className = 'status disconnected';
      this.connectBtn.disabled = false;
      this.disconnectBtn.disabled = true;
    }
  }

  private updateVisualization(): void {
    const visualization = this.docApi.getDocumentVisualization();
    this.docVisualization.textContent = visualization;
  }

  private updateDocumentStructure(): void {
    const blocks = this.docApi.getAllBlocks();
    const stats = this.docApi.getDocumentStats();

    let html = `
      <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
        <strong>文档统计:</strong> ${stats.blocksCount} 个块 |
        大小: ${stats.documentSize} 字节 |
        连接状态: ${stats.isConnected ? '已连接' : '未连接'}
      </div>
    `;

    if (blocks.length === 0) {
      html += '<div class="block-item">文档为空，点击"添加块"开始编辑</div>';
    } else {
      blocks.forEach((block, index) => {
        const isSelected = block.id === this.docApi.getSelectedBlockId();
        const content = this.docApi.getBlockTextContent(block.id);
        const displayContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

        html += `
          <div class="block-item ${isSelected ? 'selected' : ''}"
               data-block-id="${block.id}"
               style="cursor: pointer; ${isSelected ? 'border-color: #007bff; background: #e7f3ff;' : ''}">
            <div class="block-header">
              <div>
                <span class="block-type">${block.type}</span>
                ${(block as any).level ? `<span style="margin-left: 8px; font-size: 12px;">H${(block as any).level}</span>` : ''}
                ${(block as any).embedType ? `<span style="margin-left: 8px; font-size: 12px;">${(block as any).embedType}</span>` : ''}
              </div>
              <div class="block-id">${block.id}</div>
            </div>
            <div class="block-content">${displayContent || '<em>空内容</em>'}</div>
            <div style="margin-top: 8px; font-size: 11px; color: #666;">
              索引: ${index} | 字符数: ${content.length}
            </div>
          </div>
        `;
      });
    }

    this.docStructure.innerHTML = html;

    // 添加点击事件
    this.docStructure.querySelectorAll('.block-item[data-block-id]').forEach(element => {
      element.addEventListener('click', () => {
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          this.selectBlock(blockId);
        }
      });
    });
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showInfo(message: string): void {
    this.showNotification(message, 'info');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      max-width: 300px;
      word-wrap: break-word;
      transition: opacity 0.3s ease;
    `;

    switch (type) {
    case 'success':
      notification.style.backgroundColor = '#28a745';
      break;
    case 'error':
      notification.style.backgroundColor = '#dc3545';
      break;
    case 'info':
      notification.style.backgroundColor = '#17a2b8';
      break;
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // 自动移除通知
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private async insertText(): Promise<void> {
    try {
      const blockId = this.targetBlockIdInsertInput.value.trim();
      const position = parseInt(this.textPositionInsertInput.value) || 0;
      const content = this.insertContentInput.value;

      if (!blockId) {
        this.showError('请输入目标块 ID');
        return;
      }

      if (!content) {
        this.showError('请输入要插入的内容');
        return;
      }

      await this.docApi.insertText(blockId, position, content);
      this.showSuccess(`在块 ${blockId} 的位置 ${position} 插入文本: "${content}"`);
    } catch (error) {
      console.error('插入文本失败:', error);
      this.showError('插入文本失败: ' + (error as Error).message);
    }
  }

  private async deleteText(): Promise<void> {
    try {
      const blockId = this.targetBlockIdDeleteInput.value.trim();
      const position = parseInt(this.textPositionDeleteInput.value) || 0;
      const length = parseInt(this.deleteLengthInput.value) || 1;

      if (!blockId) {
        this.showError('请输入目标块 ID');
        return;
      }

      await this.docApi.deleteText(blockId, position, length);
      this.showSuccess(`从块 ${blockId} 的位置 ${position} 删除 ${length} 个字符`);
    } catch (error) {
      console.error('删除文本失败:', error);
      this.showError('删除文本失败: ' + (error as Error).message);
    }
  }

  private async formatText(): Promise<void> {
    try {
      const blockId = this.targetBlockIdFormatInput.value.trim();
      const position = parseInt(this.textPositionFormatInput.value) || 0;
      const length = parseInt(this.formatLengthInput.value) || 1;

      if (!blockId) {
        this.showError('请输入目标块 ID');
        return;
      }

      await this.docApi.formatText(blockId, position, length, { bold: true });
      this.showSuccess(`格式化块 ${blockId} 位置 ${position}-${position + length} 的文本为粗体`);
    } catch (error) {
      console.error('格式化文本失败:', error);
      this.showError('格式化文本失败: ' + (error as Error).message);
    }
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new YjsDemo();
});

// 添加一些全局样式
const style = document.createElement('style');
style.textContent = `
  .block-item.selected {
    border-color: #007bff !important;
    background: #e7f3ff !important;
  }

  .block-item:hover {
    background: #f8f9fa !important;
    border-color: #dee2e6 !important;
  }

  .block-item {
    transition: all 0.2s ease;
  }
`;
document.head.appendChild(style);
