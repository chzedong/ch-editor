import { Component, createSignal, onMount, onCleanup, createEffect, Accessor } from 'solid-js';
import { TextLine } from '@ch-editor/core';

export interface LineModelVisualizerProps {
  lines: Accessor<TextLine[]>;
}

/**
 * Line模型可视化组件
 * 在canvas中展示所有block的line模型和索引信息
 */
export const LineModelVisualizer: Component<LineModelVisualizerProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let scrollContainerRef: HTMLDivElement | undefined;

  const [ctx, setCtx] = createSignal<CanvasRenderingContext2D | null>(null);
  const [highlightOverlay, setHighlightOverlay] = createSignal<HTMLElement | null>(null);

  // 绘制配置
  const config = {
    lineHeight: 80,
    itemHeight: 50,
    padding: 20,
    fontSize: 12,
    colors: {
      line: '#007acc',
      item: '#ff6b6b',
      text: '#d4d4d4',
      background: '#1e1e1e',
      border: '#3e3e42',
      // item类型颜色
      itemTypes: {
        text: '#4ec9b0',
        box: '#ff6b6b',
        widget: '#dcdcaa'
      },
      // virtualType颜色
      virtualTypes: {
        valid: '#98c379',
        'valid-start': '#61afef',
        'valid-end': '#c678dd',
        virtual: '#e06c75'
      }
    }
  };

  // 初始化canvas
  onMount(() => {
    if (canvasRef) {
      const context = canvasRef.getContext('2d');
      setCtx(context);
      setupCanvas();

      // 添加点击事件监听
      canvasRef.addEventListener('click', handleCanvasClick);

      // 添加窗口resize事件监听
      window.addEventListener('resize', updateCanvasSize);
    }
  });

  // 清理事件监听
  onCleanup(() => {
    if (canvasRef) {
      canvasRef.removeEventListener('click', handleCanvasClick);
    }
    window.removeEventListener('resize', updateCanvasSize);
    removeHighlight();
  });

  // 当lines变化时重新绘制
  createEffect(() => {
    if (props.lines() && ctx()) {
      updateCanvasSize();
      redraw();
      updateStats();
    }
  });

  // 辅助函数：将十六进制颜色转换为RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 107, b: 107 };
  };

  const setupCanvas = () => {
    updateCanvasSize();
  };

  const updateCanvasSize = () => {
    if (!canvasRef || !scrollContainerRef) return;

    const containerWidth = scrollContainerRef.offsetWidth - 16; // 减去padding
    const canvasHeight = calculateCanvasHeight();

    canvasRef.width = containerWidth;
    canvasRef.height = canvasHeight;
    canvasRef.style.width = `${containerWidth}px`;
    canvasRef.style.height = `${canvasHeight}px`;
  };

  const calculateCanvasHeight = (): number => {
    if (!props.lines()) return 400;

    let totalHeight = config.padding;
    props.lines().forEach(line => {
      totalHeight += config.lineHeight;
      if (line.items) {
        totalHeight += line.items.length * config.itemHeight;
      }
      totalHeight += config.padding;
    });
    return Math.max(totalHeight, 400);
  };

  const updateStats = () => {
    const statsElement = containerRef?.querySelector('.line-stats');
    if (statsElement && props.lines()) {
      let totalItems = 0;
      props.lines().forEach(line => {
        if (line.items) {
          totalItems += line.items.length;
        }
      });
      statsElement.textContent = `总计: ${props.lines().length} 行, ${totalItems} 项`;
    }
  };

  const redraw = () => {
    clear();
    drawLines();
  };

  const clear = () => {
    const context = ctx();
    if (!context || !canvasRef) return;
    context.fillStyle = config.colors.background;
    context.fillRect(0, 0, canvasRef.width, canvasRef.height);
  };

  const drawLines = () => {
    if (!props.lines()) return;

    let currentY = config.padding;
    props.lines().forEach((line, lineIndex) => {
      currentY = drawLine(line, lineIndex, currentY);
      currentY += config.padding;
    });
  };

  const drawLine = (line: TextLine, lineIndex: number, startY: number): number => {
    const context = ctx();
    if (!context || !canvasRef) return startY;

    const lineRect = (line as any).getLineRect ? (line as any).getLineRect() : null;
    let currentY = startY;

    // 绘制line标题
    context.fillStyle = config.colors.line;
    context.font = `bold ${config.fontSize + 2}px monospace`;
    context.fillText(`Line ${lineIndex}`, config.padding, currentY + 15);

    // 绘制line信息
    if (lineRect) {
      context.fillStyle = config.colors.text;
      context.font = `${config.fontSize}px monospace`;
      const lineInfo = `Rect: ${lineRect.left.toFixed(0)}, ${lineRect.top.toFixed(0)}, ${lineRect.width.toFixed(0)}×${lineRect.height.toFixed(0)}`;
      context.fillText(lineInfo, config.padding + 80, currentY + 15);
    }

    currentY += 40; // 减少line header的高度

    // 计算line的总高度
    const lineContentHeight = currentY - startY + (line.items ? line.items.length * config.itemHeight : 0);

    // 绘制line边框
    context.strokeStyle = config.colors.line;
    context.lineWidth = 2;
    context.strokeRect(
      config.padding,
      startY,
      canvasRef.width - config.padding * 2,
      lineContentHeight
    );

    // 绘制items
    if (line.items) {
      line.items.forEach((item, itemIndex) => {
        currentY = drawLineItem(item, lineIndex, itemIndex, currentY);
      });
    }

    return currentY;
  };

  const drawLineItem = (item: any, lineIndex: number, itemIndex: number, startY: number): number => {
    const context = ctx();
    if (!context || !canvasRef) return startY;

    const itemX = config.padding + 20;
    const itemWidth = canvasRef.width - config.padding * 2 - 40;
    const itemHeight = config.itemHeight - 5; // 实际可用高度

    // 绘制连接线（表示文本流关系）
    if (itemIndex > 0) {
      context.strokeStyle = '#4ec9b0';
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(itemX + itemWidth / 2, startY - 3);
      context.lineTo(itemX + itemWidth / 2, startY);
      context.stroke();
      context.setLineDash([]);
    }

    // 根据item类型获取颜色
    const contentLength = (item.endBlockOffset - item.startBlockOffset) || 0;
    const itemTypeColor = config.colors.itemTypes[item.type as keyof typeof config.colors.itemTypes] || config.colors.item;
    const virtualTypeColor = config.colors.virtualTypes[item.virtualType as keyof typeof config.colors.virtualTypes] || config.colors.text;

    // 边框颜色优先使用item类型颜色
    let borderColor = itemTypeColor;

    // 绘制item背景（渐变效果，使用item类型颜色）
    const gradient = context.createLinearGradient(itemX, startY, itemX + itemWidth, startY);
    const rgb = hexToRgb(itemTypeColor);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
    context.fillStyle = gradient;
    context.fillRect(itemX, startY, itemWidth, itemHeight);

    // 绘制item边框
    context.strokeStyle = borderColor;
    context.lineWidth = 2;
    context.strokeRect(itemX, startY, itemWidth, itemHeight);

    // 绘制item标题和类型
    context.fillStyle = borderColor;
    context.font = `bold ${config.fontSize}px monospace`;
    context.fillText(`${item.type.toUpperCase()} ${itemIndex}`, itemX + 10, startY + 15);

    // 绘制virtualType信息
    context.fillStyle = virtualTypeColor;
    context.font = `${config.fontSize - 1}px monospace`;
    context.fillText(`[${item.virtualType}]`, itemX + 80, startY + 15);

    // 绘制索引信息
    if (item.startBlockOffset !== undefined && item.endBlockOffset !== undefined) {
      context.fillStyle = '#4ec9b0';
      context.font = `${config.fontSize - 1}px monospace`;
      const indexInfo = `[${item.startBlockOffset}-${item.endBlockOffset}]`;
      context.fillText(indexInfo, itemX + 150, startY + 15);
    }

    // 绘制字符数信息
    context.fillStyle = '#ce9178';
    context.fillText(`字符: ${contentLength}`, itemX + 250, startY + 15);

    // 绘制矩形信息
    if (item.contentRect) {
      const rect = item.contentRect;
      const rectInfo = `Rect: ${rect.left.toFixed(0)}, ${rect.top.toFixed(0)}, ${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`;
      context.fillStyle = '#dcdcaa';
      context.fillText(rectInfo, itemX + 10, startY + 30);
    }

    // 绘制文本内容预览（如果有）
    if (item.text && typeof item.text === 'string') {
      const preview = item.text.length > 20 ? item.text.substring(0, 20) + '...' : item.text;
      context.fillStyle = '#98c379';
      context.fillText(`"${preview}"`, itemX + 320, startY + 30);
    }

    // 绘制内容长度指示器
    const indicatorX = itemX + 10;
    const indicatorY = startY + itemHeight - 8;
    const indicatorWidth = Math.min(itemWidth - 20, contentLength * 1.5);

    context.fillStyle = borderColor;
    context.fillRect(indicatorX, indicatorY, indicatorWidth, 3);

    return startY + config.itemHeight;
  };

  const handleCanvasClick = (event: MouseEvent) => {
    if (!canvasRef) return;

    const rect = canvasRef.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedItem = getItemAtPosition(x, y);
    if (clickedItem) {
      highlightItem(clickedItem.item, clickedItem.lineIndex, clickedItem.itemIndex);
    } else {
      removeHighlight();
    }
  };

  const getItemAtPosition = (x: number, y: number): { item: any, lineIndex: number, itemIndex: number } | null => {
    if (!props.lines()) return null;

    let currentY = config.padding;

    for (let lineIndex = 0; lineIndex < props.lines().length; lineIndex++) {
      const line = props.lines()[lineIndex];
      currentY += 40; // 与drawLine保持一致

      if (line.items) {
        for (let itemIndex = 0; itemIndex < line.items.length; itemIndex++) {
          const itemX = config.padding + 20;
          const itemWidth = canvasRef!.width - config.padding * 2 - 40;
          const itemHeight = config.itemHeight - 5; // 与drawLineItem保持一致

          // 检查点击是否在item区域内
          if (x >= itemX && x <= itemX + itemWidth &&
              y >= currentY && y <= currentY + itemHeight) {
            return { item: line.items[itemIndex], lineIndex, itemIndex };
          }

          currentY += config.itemHeight;
        }
      }

      currentY += config.padding;
    }

    return null;
  };

  let timer: number;

  const highlightItem = (item: any, lineIndex: number, itemIndex: number) => {
    // 移除之前的高亮
    removeHighlight();
    clearTimeout(timer);
    // 检查item是否有contentRect信息
    if (!item.contentRect) {
      console.warn('Item没有contentRect信息，无法定位');
      return;
    }

    const rect = item.contentRect;

    // 创建高亮覆盖层
    const overlay = document.createElement('div');
    overlay.className = 'line-model-highlight-overlay';
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    // 添加标签显示item信息
    const label = document.createElement('div');
    label.className = 'line-model-highlight-label';
    label.textContent = `Line ${lineIndex} ${item.type.toUpperCase()} ${itemIndex} [${item.virtualType}]`;

    overlay.appendChild(label);
    document.body.appendChild(overlay);
    setHighlightOverlay(overlay);

    // 5秒后自动移除高亮
    timer = setTimeout(() => {
      removeHighlight();
    }, 5000);

    console.log(`点击了 Line ${lineIndex} Item ${itemIndex}:`, item);
  };

  const removeHighlight = () => {
    const overlay = highlightOverlay();
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      setHighlightOverlay(null);
    }
  };

  return (
    <div class="debug-component" ref={containerRef}>
      <div class="debug-component-title">Line模型可视化</div>

      <div class="debug-component-toolbar">
        <div class="line-stats">总计: 0 行, 0 项</div>
        <button
          class="debug-button debug-button-secondary"
          onClick={() => {
            updateCanvasSize();
            redraw();
          }}
        >
          刷新
        </button>
      </div>

      <div class="debug-scroll-container" ref={scrollContainerRef}>
        <canvas
          ref={canvasRef}
          class="debug-canvas"
        />
      </div>
    </div>
  );
};
