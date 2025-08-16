import { TextLine } from '@ch-editor/core';

/**
 * Line模型可视化组件
 * 在canvas中展示所有block的line模型和索引信息
 */
export class LineModelVisualizer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lines: TextLine[] = [];
  private scrollContainer: HTMLElement;

  // 绘制配置
  private readonly config = {
    lineHeight: 80,
    itemHeight: 50,
    padding: 20,
    fontSize: 12,
    colors: {
      line: '#007acc',
      item: '#ff6b6b',
      text: '#d4d4d4',
      background: '#1e1e1e',
      border: '#3e3e42'
    }
  };

  constructor() {
    this.createContainer();
  }

  /**
   * 创建容器和canvas
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      background: ${this.config.colors.background};
      position: relative;
      overflow: hidden;
    `;

    // 创建滚动容器
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      position: relative;
    `;

    // 创建canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.cssText = `
      display: block;
      background: ${this.config.colors.background};
    `;

    // 创建标题
    const title = document.createElement('div');
    title.style.cssText = `
      padding: 15px;
      font-size: 14px;
      font-weight: bold;
      color: ${this.config.colors.text};
      border-bottom: 1px solid ${this.config.colors.border};
    `;
    title.textContent = 'Line模型可视化';

    // 创建工具栏
    const toolbar = this.createToolbar();

    this.scrollContainer.appendChild(this.canvas);
    this.container.appendChild(title);
    this.container.appendChild(toolbar);
    this.container.appendChild(this.scrollContainer);

    this.setupCanvas();
  }

  /**
   * 创建工具栏
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 10px 15px;
      background: #252526;
      border-bottom: 1px solid ${this.config.colors.border};
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 12px;
    `;

    // 刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新';
    refreshBtn.style.cssText = `
      padding: 5px 10px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    refreshBtn.addEventListener('click', () => this.redraw());

    // 统计信息
    const stats = document.createElement('span');
    stats.style.color = '#d4d4d4';
    stats.textContent = `Lines: ${this.lines.length}`;
    stats.id = 'line-stats';

    toolbar.appendChild(refreshBtn);
    toolbar.appendChild(stats);

    return toolbar;
  }

  /**
   * 设置canvas
   */
  private setupCanvas(): void {
    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  /**
   * 更新canvas尺寸
   */
  private updateCanvasSize(): void {
    const containerRect = this.scrollContainer.getBoundingClientRect();
    const width = Math.max(containerRect.width, 300);
    const height = Math.max(this.calculateCanvasHeight(), containerRect.height);

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.redraw();
  }

  /**
   * 计算canvas所需高度
   */
  private calculateCanvasHeight(): number {
    let totalHeight = this.config.padding;

    this.lines.forEach(line => {
      totalHeight += this.config.lineHeight;
      totalHeight += line.items.length * this.config.itemHeight;
      totalHeight += this.config.padding;
    });

    return Math.max(totalHeight, 400);
  }

  /**
   * 更新line数据
   */
  updateLines(lines: TextLine[]): void {
    this.lines = lines;
    this.updateCanvasSize();
    this.updateStats();
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const stats = this.container.querySelector('#line-stats');
    if (stats) {
      const totalItems = this.lines.reduce((sum, line) => sum + line.items.length, 0);
      stats.textContent = `Lines: ${this.lines.length}, Items: ${totalItems}`;
    }
  }

  /**
   * 重绘canvas
   */
  private redraw(): void {
    this.clear();
    this.drawLines();
  }

  /**
   * 清空canvas
   */
  private clear(): void {
    this.ctx.fillStyle = this.config.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 绘制所有line
   */
  private drawLines(): void {
    let currentY = this.config.padding;

    this.lines.forEach((line, lineIndex) => {
      currentY = this.drawLine(line, lineIndex, currentY);
      currentY += this.config.padding;
    });
  }

  /**
   * 绘制单个line
   */
  private drawLine(line: TextLine, lineIndex: number, startY: number): number {
    const lineRect = line.getRect();
    let currentY = startY;

    // 绘制line标题
    this.ctx.fillStyle = this.config.colors.line;
    this.ctx.font = `bold ${this.config.fontSize + 2}px monospace`;
    this.ctx.fillText(`Line ${lineIndex}`, this.config.padding, currentY + 15);

    // 绘制line信息
    this.ctx.fillStyle = this.config.colors.text;
    this.ctx.font = `${this.config.fontSize}px monospace`;
    const lineInfo = `Rect: ${lineRect.left.toFixed(0)}, ${lineRect.top.toFixed(0)}, ${lineRect.width.toFixed(0)}×${lineRect.height.toFixed(0)}`;
    this.ctx.fillText(lineInfo, this.config.padding + 80, currentY + 15);

    currentY += this.config.lineHeight;

    // 绘制line边框
    this.ctx.strokeStyle = this.config.colors.line;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      this.config.padding,
      startY,
      this.canvas.width - this.config.padding * 2,
      currentY - startY + line.items.length * this.config.itemHeight
    );

    // 绘制items
    line.items.forEach((item, itemIndex) => {
      currentY = this.drawLineItem(item, lineIndex, itemIndex, currentY);
    });

    return currentY;
  }

  /**
   * 绘制line item
   */
  private drawLineItem(item: any, lineIndex: number, itemIndex: number, startY: number): number {
    const itemX = this.config.padding + 20;
    const itemWidth = this.canvas.width - this.config.padding * 2 - 40;
    const itemHeight = this.config.itemHeight;

    // 绘制连接线（表示文本流关系）
    if (itemIndex > 0) {
      this.ctx.strokeStyle = '#4ec9b0';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(itemX + itemWidth / 2, startY - 5);
      this.ctx.lineTo(itemX + itemWidth / 2, startY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 根据内容长度调整边框颜色
    const contentLength = item.text?.length || 0;
    let borderColor = this.config.colors.item;
    if (contentLength > 50) borderColor = '#f14c4c';
    else if (contentLength > 20) borderColor = '#ffcc02';

    // 绘制item背景（渐变效果）
    const gradient = this.ctx.createLinearGradient(itemX, startY, itemX + itemWidth, startY);
    gradient.addColorStop(0, 'rgba(255, 107, 107, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.05)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(itemX, startY, itemWidth, itemHeight - 5);

    // 绘制item边框
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(itemX, startY, itemWidth, itemHeight - 5);

    // 绘制item序号标记
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.config.fontSize - 2}px monospace`;
    this.ctx.fillText(String(itemIndex), itemX - 15, startY + 15);

    // 绘制item标题
    this.ctx.fillStyle = borderColor;
    this.ctx.font = `bold ${this.config.fontSize}px monospace`;
    this.ctx.fillText(`Item ${itemIndex}`, itemX + 10, startY + 15);

    // 绘制索引信息
    this.ctx.fillStyle = '#4ec9b0';
    this.ctx.font = `${this.config.fontSize - 1}px monospace`;
    const indexInfo = `[${item.startBlockOffset}-${item.endBlockOffset}]`;
    this.ctx.fillText(indexInfo, itemX + 80, startY + 15);

    // 绘制字符数信息
    this.ctx.fillStyle = '#ce9178';
    this.ctx.fillText(`字符: ${contentLength}`, itemX + 180, startY + 15);

    // 绘制矩形信息
    if (item.contentRect) {
      const rect = item.contentRect;
      const rectInfo = `Rect: ${rect.left.toFixed(0)}, ${rect.top.toFixed(0)}, ${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`;
      this.ctx.fillStyle = '#dcdcaa';
      this.ctx.fillText(rectInfo, itemX + 10, startY + 30);
    }

    // 绘制文本内容预览（如果有）
    if (item.text && typeof item.text === 'string') {
      const preview = item.text.length > 25 ? item.text.substring(0, 25) + '...' : item.text;
      this.ctx.fillStyle = '#98c379';
      this.ctx.fillText(`"${preview}"`, itemX + 250, startY + 30);
    }

    // 绘制内容长度指示器
    const indicatorX = itemX + 10;
    const indicatorY = startY + itemHeight - 12;
    const indicatorWidth = Math.min(itemWidth - 20, contentLength * 1.5);

    this.ctx.fillStyle = borderColor;
    this.ctx.fillRect(indicatorX, indicatorY, indicatorWidth, 3);

    return startY + this.config.itemHeight;
  }

  /**
   * 获取容器元素
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    window.removeEventListener('resize', () => this.updateCanvasSize());
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
