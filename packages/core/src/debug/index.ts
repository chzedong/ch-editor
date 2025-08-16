import { LineVisualizer } from './line-visualizer';
import { TextLine } from '../line';

/**
 * 调试工具管理器
 */
export class DebugManager {
  private static instance: DebugManager;
  private lineVisualizer: LineVisualizer | null = null;
  private container: HTMLElement | null = null;

  private constructor() {}

  /**
   * 获取调试管理器单例
   */
  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  /**
   * 初始化调试工具
   */
  init(container: HTMLElement): void {
    this.container = container;
    this.lineVisualizer = new LineVisualizer(container);
    this.enableLineVisualizer();
  }

  /**
   * 切换line可视化
   */
  toggleLineVisualizer(): void {
    if (this.lineVisualizer) {
      this.lineVisualizer.toggle();
    }
  }

  /**
   * 启用line可视化
   */
  enableLineVisualizer(): void {
    if (this.lineVisualizer) {
      this.lineVisualizer.enable();
    }
  }

  /**
   * 禁用line可视化
   */
  disableLineVisualizer(): void {
    if (this.lineVisualizer) {
      this.lineVisualizer.disable();
    }
  }

  /**
   * 更新line数据
   */
  updateLines(lines: TextLine[]): void {
    if (this.lineVisualizer) {
      this.lineVisualizer.setLines(lines);
    }
  }

  /**
   * 销毁调试工具
   */
  destroy(): void {
    if (this.lineVisualizer) {
      this.lineVisualizer.destroy();
      this.lineVisualizer = null;
    }
    this.container = null;
  }
}

// 导出便捷函数
export const debugManager = DebugManager.getInstance();

/**
 * 初始化调试工具
 */
export function initDebugTools(container: HTMLElement): void {
  debugManager.init(container);
}

/**
 * 切换line可视化
 */
export function toggleLineVisualizer(): void {
  debugManager.toggleLineVisualizer();
}

/**
 * 更新line数据用于可视化
 */
export function updateLinesForVisualization(lines: TextLine[]): void {
  debugManager.updateLines(lines);
}

export { LineVisualizer };
