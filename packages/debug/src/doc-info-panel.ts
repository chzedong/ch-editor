/**
 * Doc信息面板组件
 * 展示文档结构和元数据信息
 */
export class DocInfoPanel {
  private container: HTMLElement;
  private contentContainer: HTMLElement;
  private docInfo: any = null;

  constructor() {
    this.createContainer();
  }

  /**
   * 创建容器
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      background: #1e1e1e;
      color: #d4d4d4;
      overflow: auto;
    `;

    // 创建标题
    const title = document.createElement('div');
    title.style.cssText = `
      padding: 15px;
      font-size: 14px;
      font-weight: bold;
      color: #d4d4d4;
      border-bottom: 1px solid #3e3e42;
    `;
    title.textContent = 'Doc信息查看';

    // 创建工具栏
    const toolbar = this.createToolbar();

    // 创建内容容器
    this.contentContainer = document.createElement('div');
    this.contentContainer.style.cssText = `
      padding: 15px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.5;
    `;

    this.container.appendChild(title);
    this.container.appendChild(toolbar);
    this.container.appendChild(this.contentContainer);

    this.renderEmptyState();
  }

  /**
   * 创建工具栏
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 10px 15px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 12px;
    `;

    // 导出按钮
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '导出JSON';
    exportBtn.style.cssText = `
      padding: 5px 10px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    exportBtn.addEventListener('click', () => this.exportJson());

    toolbar.appendChild(exportBtn);

    return toolbar;
  }

  /**
   * 渲染空状态
   */
  private renderEmptyState(): void {
    this.contentContainer.innerHTML = `
      <div style="
        text-align: center;
        padding: 40px 20px;
        color: #666;
        font-style: italic;
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
        <div>暂无文档信息</div>
        <div style="font-size: 11px; margin-top: 10px;">请在编辑器中加载文档后查看</div>
      </div>
    `;
  }

  /**
   * 更新文档信息
   */
  updateDocInfo(docInfo: any): void {
    this.docInfo = docInfo;
    this.render();
  }

  /**
   * 渲染文档信息
   */
  private render(): void {
    if (!this.docInfo) {
      this.renderEmptyState();
      return;
    }

    const sections = [
      this.renderStructureInfo(),
      this.renderRawData()
    ];

    this.contentContainer.innerHTML = sections.join('');
  }

  /**
   * 渲染结构信息
   */
  private renderStructureInfo(): string {
    const info = this.docInfo;
    return `
      <div class="doc-section" style="margin-top: 20px;">
        <h3 style="
          color: #007acc;
          margin: 0 0 10px 0;
          font-size: 13px;
          border-bottom: 1px solid #3e3e42;
          padding-bottom: 5px;
        ">结构信息</h3>
        <div class="doc-item">
          <span class="label">块数量:</span>
          <span class="value">${info.blocks ? info.blocks.length : 0}</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染原始数据
   */
  private renderRawData(): string {
    const jsonStr = JSON.stringify(this.docInfo, null, 2);
    return `
      <div class="doc-section" style="margin-top: 20px;">
        <h3 style="
          color: #007acc;
          margin: 0 0 10px 0;
          font-size: 13px;
          border-bottom: 1px solid #3e3e42;
          padding-bottom: 5px;
        ">原始数据</h3>
        <pre style="
          background: #252526;
          padding: 10px;
          border-radius: 4px;
          overflow: auto;
          font-size: 11px;
          line-height: 1.4;
          color: #d4d4d4;
          border: 1px solid #3e3e42;
          max-height: 300px;
        ">${this.escapeHtml(jsonStr)}</pre>
      </div>
    `;
  }

  /**
   * 转义HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 导出JSON
   */
  private exportJson(): void {
    if (!this.docInfo) {
      alert('暂无数据可导出');
      return;
    }

    const jsonStr = JSON.stringify(this.docInfo, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `doc-info-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * 获取容器元素
   */
  getElement(): HTMLElement {
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .doc-item {
        display: flex;
        margin-bottom: 8px;
        align-items: flex-start;
      }
      .doc-item .label {
        min-width: 80px;
        color: #569cd6;
        font-weight: 500;
      }
      .doc-item .value {
        color: #d4d4d4;
        word-break: break-all;
        flex: 1;
      }
    `;

    if (!document.head.querySelector('style[data-doc-info-panel]')) {
      style.setAttribute('data-doc-info-panel', 'true');
      document.head.appendChild(style);
    }

    return this.container;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
