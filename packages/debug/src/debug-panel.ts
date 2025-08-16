import { DocBlock, DocObject, TextLine } from '@ch-editor/core';
import { LineModelVisualizer } from './line-model-visualizer';
import { DocInfoPanel } from './doc-info-panel';

export interface DebugPanelTab {
  id: string;
  label: string;
  content: HTMLElement;
}

/**
 * 调试面板主组件
 * 提供左侧抽屉式界面，支持多个tab切换
 */
export class DebugPanel {
  private panel: HTMLElement;
  private tabContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private toggleButton: HTMLElement;
  private isOpen: boolean = false;
  private tabs: Map<string, DebugPanelTab> = new Map();

  // 子组件
  private lineModelVisualizer: LineModelVisualizer;
  private docInfoPanel: DocInfoPanel;

  constructor() {
    this.createPanel();
    this.initializeComponents();
    this.setupEventListeners();
  }

  /**
   * 创建面板DOM结构
   */
  private createPanel(): void {
    // 创建切换按钮
    this.toggleButton = document.createElement('div');
    this.toggleButton.className = 'debug-toggle-btn';
    this.toggleButton.innerHTML = '🐛';
    this.toggleButton.style.cssText = `
      position: fixed;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      background: #007acc;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;

    // 创建主面板
    this.panel = document.createElement('div');
    this.panel.className = 'debug-panel';
    this.panel.style.cssText = `
      position: fixed;
      right: -350px;
      top: 0;
      width: 350px;
      height: 100vh;
      background: #1e1e1e;
      color: #d4d4d4;
      z-index: 9999;
      transition: right 0.3s ease;
      box-shadow: -2px 0 8px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // 创建标题栏
    const header = document.createElement('div');
    header.className = 'debug-panel-header';
    header.style.cssText = `
      padding: 15px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      font-weight: bold;
      font-size: 14px;
    `;
    header.textContent = 'CH Editor 调试面板';

    // 创建tab容器
    this.tabContainer = document.createElement('div');
    this.tabContainer.className = 'debug-tab-container';
    this.tabContainer.style.cssText = `
      display: flex;
      background: #2d2d30;
      border-bottom: 1px solid #3e3e42;
    `;

    // 创建内容容器
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'debug-content-container';
    this.contentContainer.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 0;
    `;

    // 组装面板
    this.panel.appendChild(header);
    this.panel.appendChild(this.tabContainer);
    this.panel.appendChild(this.contentContainer);

    // 添加到页面
    document.body.appendChild(this.toggleButton);
    document.body.appendChild(this.panel);
  }

  /**
   * 初始化子组件
   */
  private initializeComponents(): void {
    this.lineModelVisualizer = new LineModelVisualizer();
    this.docInfoPanel = new DocInfoPanel();

    // 添加默认tabs
    this.addTab({
      id: 'line-model',
      label: 'Line模型',
      content: this.lineModelVisualizer.getElement()
    });

    this.addTab({
      id: 'doc-info',
      label: 'Doc信息',
      content: this.docInfoPanel.getElement()
    });

    // 激活第一个tab
    this.activateTab('line-model');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * 添加tab
   */
  addTab(tab: DebugPanelTab): void {
    this.tabs.set(tab.id, tab);

    // 创建tab按钮
    const tabButton = document.createElement('div');
    tabButton.className = 'debug-tab';
    tabButton.dataset.tabId = tab.id;
    tabButton.textContent = tab.label;
    tabButton.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-right: 1px solid #3e3e42;
      transition: background-color 0.2s;
      font-size: 12px;
    `;

    tabButton.addEventListener('click', () => {
      this.activateTab(tab.id);
    });

    this.tabContainer.appendChild(tabButton);
  }

  /**
   * 激活指定tab
   */
  activateTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // 更新tab样式
    const tabButtons = this.tabContainer.querySelectorAll('.debug-tab');
    tabButtons.forEach(btn => {
      const button = btn as HTMLElement;
      if (button.dataset.tabId === tabId) {
        button.style.backgroundColor = '#007acc';
        button.style.color = 'white';
      } else {
        button.style.backgroundColor = 'transparent';
        button.style.color = '#d4d4d4';
      }
    });

    // 更新内容
    this.contentContainer.innerHTML = '';
    this.contentContainer.appendChild(tab.content);
  }

  /**
   * 切换面板显示/隐藏
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 打开面板
   */
  open(): void {
    this.isOpen = true;
    this.panel.style.right = '0';
    this.toggleButton.style.right = '360px';
    this.toggleButton.innerHTML = '✕';
  }

  /**
   * 关闭面板
   */
  close(): void {
    this.isOpen = false;
    this.panel.style.right = '-350px';
    this.toggleButton.style.right = '10px';
    this.toggleButton.innerHTML = '🐛';
  }

  /**
   * 更新line数据
   */
  updateLines(lines: TextLine[]): void {
    this.lineModelVisualizer.updateLines(lines);
  }

  /**
   * 更新文档信息
   */
  updateDocInfo(docInfo: DocObject): void {
    this.docInfoPanel.updateDocInfo(docInfo);
  }

  /**
   * 销毁面板
   */
  destroy(): void {
    this.lineModelVisualizer.destroy();
    this.docInfoPanel.destroy();

    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    if (this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
  }
}
