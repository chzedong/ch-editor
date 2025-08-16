import { initDebugTools, toggleLineVisualizer } from './index';

/**
 * 调试工具使用示例
 *
 * 这个文件展示了如何在编辑器中集成和使用line模型可视化调试工具
 */

/**
 * 初始化编辑器调试功能
 * @param editorContainer 编辑器容器元素
 */
export function setupEditorDebug(editorContainer: HTMLElement): void {
  // 初始化调试工具
  initDebugTools(editorContainer);

  // 添加调试控制面板
  createDebugControlPanel();

  console.log('编辑器调试功能已启用');
  console.log('快捷键:');
  console.log('  Ctrl + Shift + D: 切换line可视化');
}

/**
 * 创建调试控制面板
 */
function createDebugControlPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'debug-control-panel';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    min-width: 200px;
  `;

  panel.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">调试工具</div>
    <button id="toggle-line-viz" style="
      background: #007acc;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      margin-right: 5px;
    ">切换Line可视化</button>
    <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
      快捷键: Ctrl+Shift+D
    </div>
  `;

  // 添加事件监听器
  const toggleButton = panel.querySelector('#toggle-line-viz') as HTMLButtonElement;
  toggleButton.addEventListener('click', () => {
    toggleLineVisualizer();
  });

  document.body.appendChild(panel);
}

/**
 * 移除调试控制面板
 */
export function removeDebugControlPanel(): void {
  const panel = document.getElementById('debug-control-panel');
  if (panel) {
    panel.remove();
  }
}

/**
 * 在开发环境中自动启用调试功能
 */
// export function autoEnableDebugInDev(): void {
//   if (process.env.NODE_ENV === 'development') {
//     // 等待DOM加载完成
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', () => {
//         const editorContainer = document.querySelector('[data-editor-container]') as HTMLElement;
//         if (editorContainer) {
//           setupEditorDebug(editorContainer);
//         }
//       });
//     } else {
//       const editorContainer = document.querySelector('[data-editor-container]') as HTMLElement;
//       if (editorContainer) {
//         setupEditorDebug(editorContainer);
//       }
//     }
//   }
// }