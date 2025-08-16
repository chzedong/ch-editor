import { TextLine } from '@ch-editor/core';
import { DebugPanel } from './debug-panel';

/**
 * 调试管理器
 */
export class DebugManager {
  private debugPanel: DebugPanel | null = null;
  private isInitialized = false;

  /**
   * 初始化调试工具
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    this.debugPanel = new DebugPanel();
    this.isInitialized = true;
  }

  /**
   * 更新行数据
   */
  updateLines(lines: TextLine[]): void {
    if (this.debugPanel) {
      this.debugPanel.updateLines(lines);
    }
  }

  /**
   * 更新文档信息
   */
  updateDocInfo(docInfo: any): void {
    if (this.debugPanel) {
      this.debugPanel.updateDocInfo(docInfo);
    }
  }
}

/**
 * 初始化调试工具
 */
export function initDebugTools() {
  const debugManager = new DebugManager();
  debugManager.init();

  return debugManager;
}

