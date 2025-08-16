import { TextLine } from '../line';

/**
 * Line模型可视化调试工具
 * 通过监听DOM变化和图形绘制来展示多行文本的索引和rect信息
 */
export class LineVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private isEnabled: boolean = false;
  private lines: TextLine[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.setupCanvas();
  }

  /**
   * 设置画布
   */
  private setupCanvas(): void {
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.border = '1px solid red';
    this.canvas.style.background = 'rgba(255, 255, 255, 0.1)';

    document.body.appendChild(this.canvas);

    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  /**
   * 更新画布尺寸
   */
  private updateCanvasSize(): void {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.canvas.style.left = `${rect.left}px`;
    this.canvas.style.top = `${rect.top}px`;
  }

  /**
   * 启用可视化
   */
  enable(): void {
    this.isEnabled = true;
    this.canvas.style.display = 'block';
    this.redraw();
  }

  /**
   * 禁用可视化
   */
  disable(): void {
    this.isEnabled = false;
    this.canvas.style.display = 'none';
    this.clear();
  }

  /**
   * 设置要可视化的行数据
   */
  setLines(lines: TextLine[]): void {
    this.lines = lines;
    if (this.isEnabled) {
      this.redraw();
    }
  }

  /**
   * 重绘可视化内容
   */
  private redraw(): void {
    this.clear();
    this.updateCanvasSize();
    // this.drawLines();
    this.drawIndexes();
    this.drawRects();
  }

  /**
   * 清空画布
   */
  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 绘制行信息
   */
  private drawLines(): void {
    const containerRect = this.container.getBoundingClientRect();

    this.lines.forEach((line, lineIndex) => {
      // 绘制行边界
      this.ctx.strokeStyle = '#007acc';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);

      const lineRect = line.getRect();
      const relativeRect = {
        left: lineRect.left - containerRect.left,
        top: lineRect.top - containerRect.top,
        width: lineRect.width,
        height: lineRect.height
      };

      this.ctx.strokeRect(relativeRect.left, relativeRect.top, relativeRect.width, relativeRect.height);

      // 绘制行号
      this.ctx.fillStyle = '#007acc';
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`Line ${lineIndex}`, relativeRect.left - 40, relativeRect.top + 12);
    });
  }

  /**
   * 绘制索引信息
   */
  private drawIndexes(): void {
    this.lines.forEach((line) => {
      line.items.forEach((item) => {
        // 绘制item索引信息（右侧对齐）
        const itemRect = item.contentRect;
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '10px monospace';
        const indexText = `[${item.startBlockOffset}-${item.endBlockOffset}]`;
        const textMetrics = this.ctx.measureText(indexText);
        this.ctx.fillText(indexText, this.canvas.width - textMetrics.width - 5, itemRect.top + 10);
      });
    });
  }

  /**
   * 绘制矩形区域详细信息
   */
  private drawRects(): void {
    this.lines.forEach((line) => {
      line.items.forEach((item) => {
        const rect = item.contentRect;

        // 绘制矩形信息到行的最左边
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '10px monospace';
        const rectInfo = `${Number(rect.left).toFixed(0)}×${Number(rect.top).toFixed(0)}`;
        this.ctx.fillText(rectInfo, 5, rect.top + 3); // 距离左边5px，垂直位置在rect顶部+12px
      });
    });
  }

  /**
   * 销毁可视化器
   */
  destroy(): void {
    this.disable();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    window.removeEventListener('resize', () => this.updateCanvasSize());
  }

  /**
   * 切换可视化状态
   */
  toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
}
