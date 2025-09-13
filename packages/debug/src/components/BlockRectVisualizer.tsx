import { Component, createSignal, onMount, onCleanup, createEffect, Accessor } from 'solid-js';
import { BlockElement, Editor as _Editor } from '@ch-editor/core';

export interface BlockRectVisualizerProps {
  blocks: Accessor<BlockElement[]>;
}

/**
 * Block矩形位置可视化组件
 * 在canvas中展示所有block的矩形位置信息
 */
export const BlockRectVisualizer: Component<BlockRectVisualizerProps> = (props) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [ctx, setCtx] = createSignal<CanvasRenderingContext2D>();
  const [highlightOverlay, setHighlightOverlay] = createSignal<HTMLElement>();
  const [stats, setStats] = createSignal({ totalBlocks: 0, visibleBlocks: 0 });

  // 绘制配置
  const config = {
    blockHeight: 80,
    padding: 20,
    fontSize: 12,
    colors: {
      background: '#1e1e1e',
      text: '#d4d4d4',
      border: '#3e3e42',
      canvasBorder: '#4e4e52',
      highlight: '#ff6b6b',
      // 不同block类型的颜色
      blockTypes: {
        text: '#61afef',      // 段落 - 蓝色
        h1: '#e06c75',     // 标题1 - 红色
        h2: '#e06c75',     // 标题2 - 红色
        h3: '#e06c75',     // 标题3 - 红色
        h4: '#e06c75',     // 标题4 - 红色
        h5: '#e06c75',     // 标题5 - 红色
        h6: '#e06c75',     // 标题6 - 红色
        div: '#98c379',    // 容器 - 绿色
        span: '#dcdcaa',   // 行内元素 - 黄色
        ul: '#c678dd',     // 无序列表 - 紫色
        ol: '#c678dd',     // 有序列表 - 紫色
        li: '#56b6c2',     // 列表项 - 青色
        blockquote: '#d19a66', // 引用 - 橙色
        code: '#abb2bf',   // 代码 - 灰色
        pre: '#abb2bf',    // 预格式化 - 灰色
        table: '#f39c12',  // 表格 - 橙黄色
        tr: '#f39c12',     // 表格行 - 橙黄色
        td: '#f39c12',     // 表格单元格 - 橙黄色
        th: '#f39c12',     // 表格标题 - 橙黄色
        img: '#e74c3c',    // 图片 - 深红色
        a: '#3498db',      // 链接 - 蓝色
        button: '#9b59b6', // 按钮 - 紫色
        input: '#2ecc71',  // 输入框 - 绿色
        textarea: '#2ecc71', // 文本域 - 绿色
        select: '#2ecc71', // 选择框 - 绿色
        default: '#4CAF50' // 默认颜色 - 绿色
      }
    }
  };

  let scrollContainer: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver;

  // 辅助函数：将hex颜色转换为rgb
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  onMount(() => {
    setupCanvas();
    setupResizeObserver();
  });

  onCleanup(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    removeHighlight();
  });

  createEffect(() => {
    // 当blocks变化时重新绘制
    if (props.blocks() && ctx()) {
      updateStats();
      redraw();
    }
  });

  const setupCanvas = () => {
    const canvasEl = canvas();
    if (!canvasEl) return;

    const context = canvasEl.getContext('2d');
    if (context) {
      setCtx(context);
      updateCanvasSize();
    }
  };

  const setupResizeObserver = () => {
    if (!scrollContainer) return;

    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(scrollContainer);
  };

  const updateCanvasSize = () => {
    const canvasEl = canvas();
    if (!canvasEl || !scrollContainer) return;

    const containerWidth = scrollContainer.clientWidth - 16; // 减去padding
    const canvasHeight = calculateCanvasHeight();

    canvasEl.width = containerWidth;
    canvasEl.height = canvasHeight;
    canvasEl.style.width = `${containerWidth}px`;
    canvasEl.style.height = `${canvasHeight}px`;

    redraw();
  };

  const calculateCanvasHeight = (): number => {
    const blockCount = props.blocks()?.length || 0;
    return Math.max(200, blockCount * config.blockHeight + config.padding * 2);
  };

  const updateStats = () => {
    const blocks = props.blocks() || [];
    const totalBlocks = blocks.length;
    const visibleBlocks = blocks.filter(block => {
      const rect = block.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length;

    setStats({ totalBlocks, visibleBlocks });
  };

  const redraw = () => {
    const context = ctx();
    if (!context) return;

    clear();
    drawBlocks();
  };

  const clear = () => {
    const context = ctx();
    const canvasEl = canvas();
    if (!context || !canvasEl) return;

    // 绘制背景
    context.fillStyle = config.colors.background;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);

    // 绘制canvas边框
    context.strokeStyle = config.colors.canvasBorder;
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvasEl.width - 2, canvasEl.height - 2);
  };

  const drawBlocks = () => {
    const blocks = props.blocks() || [];
    let currentY = config.padding;

    blocks.forEach((block, index) => {
      currentY = drawBlock(block, index, currentY);
    });
  };

  const drawBlock = (block: BlockElement, blockIndex: number, startY: number): number => {
    const context = ctx();
    const canvasEl = canvas();
    if (!context || !canvasEl) return startY;

    const rect = block.getBoundingClientRect();
    const blockY = startY;
    const blockHeight = config.blockHeight;

    // 获取block类型对应的颜色
    const blockType = block.getAttribute('data-block-type');
    const blockColor = config.colors.blockTypes[blockType as keyof typeof config.colors.blockTypes] || config.colors.blockTypes.default;

    // 绘制block背景（渐变效果）
    const gradient = context.createLinearGradient(config.padding, blockY, canvasEl.width - config.padding, blockY);
    const rgb = hexToRgb(blockColor);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
    context.fillStyle = gradient;
    context.fillRect(config.padding, blockY, canvasEl.width - config.padding * 2, blockHeight - 10);

    // 绘制边框（使用block类型颜色）
    context.strokeStyle = blockColor;
    context.lineWidth = 2;
    context.strokeRect(config.padding, blockY, canvasEl.width - config.padding * 2, blockHeight - 10);

    // 绘制文本信息
    const textX = config.padding + 8;
    const actualBlockHeight = blockHeight - 10; // 实际可用高度
    let textY = blockY + 16;
    const lineHeight = 12; // 增加行高，确保清晰显示

    // Block类型标题（使用block颜色）
    context.fillStyle = blockColor;
    context.font = `bold ${config.fontSize}px monospace`;
    context.fillText(`${blockType?.toUpperCase() ?? 'UNKNOWN'} ${blockIndex}`, textX, textY);
    textY += lineHeight + 3;

    // Block详细信息
    context.fillStyle = config.colors.text;
    context.font = `${config.fontSize - 1}px monospace`;

    const blockInfo = [
      `ID: ${block.id || 'N/A'}`,
      `Class: ${block.className || 'None'}`,
      `Rect: ${rect.left.toFixed(0)}, ${rect.top.toFixed(0)}, ${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`
    ];

    // 显示所有信息
    blockInfo.forEach((info, _index) => {
      if (textY + lineHeight <= blockY + actualBlockHeight) {
        context.fillText(info, textX, textY);
        textY += lineHeight;
      }
    });

    return startY + blockHeight;
  };

  const handleCanvasClick = (event: MouseEvent) => {
    const canvasEl = canvas();
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const result = getBlockAtPosition(x, y);
    if (result) {
      highlightBlock(result.block, result.blockIndex);
    } else {
      removeHighlight();
    }
  };

  const getBlockAtPosition = (x: number, y: number): { block: BlockElement, blockIndex: number } | null => {
    const blocks = props.blocks() || [];
    let currentY = config.padding;

    for (let i = 0; i < blocks.length; i++) {
      const blockHeight = config.blockHeight;

      if (y >= currentY && y <= currentY + blockHeight - 10) {
        return { block: blocks[i], blockIndex: i };
      }

      currentY += blockHeight;
    }

    return null;
  };

  const highlightBlock = (block: BlockElement, _blockIndex: number) => {
    removeHighlight();

    const rect = block.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'block-rect-highlight-overlay';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    document.body.appendChild(overlay);
    setHighlightOverlay(overlay);

    // 3秒后自动移除高亮
    setTimeout(() => {
      removeHighlight();
    }, 3000);
  };

  const removeHighlight = () => {
    const overlay = highlightOverlay();
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      setHighlightOverlay(undefined);
    }
  };

  const clearCanvas = () => {
    redraw();
  };

  return (
    <div class="debug-component">
      <div class="debug-component-title">Block矩形可视化</div>

      <div class="debug-component-toolbar">
        <div class="debug-stats">
          <span>总计: {stats().totalBlocks}</span>
          <span>可见: {stats().visibleBlocks}</span>
        </div>
        <button
          class="debug-button debug-button-secondary"
          onClick={clearCanvas}
        >
          刷新
        </button>
      </div>

      <div
        class="debug-component-content block-rect-canvas-container"
        ref={scrollContainer}
      >
        <canvas
          ref={setCanvas}
          onClick={handleCanvasClick}
          class="block-rect-canvas"
        />
      </div>
    </div>
  );
};
