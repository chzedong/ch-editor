import { Accessor, Component, createSignal, onCleanup, Show } from 'solid-js';
import { DebugPanel } from '@ch-editor/debug';
import { Editor } from './components/Editor';
import { Toolbar } from './components/Toolbar';
import './style.css';

import { Editor as EditorType } from '@ch-editor/core';

/**
 * 主应用组件
 */
const App: Component = () => {
  const [editor, setEditor] = createSignal<EditorType | null>(null);
  const [isDebugOpen, setIsDebugOpen] = createSignal(false);

  const toggleDebug = () => {
    setIsDebugOpen(!isDebugOpen());
  };

  // 处理编辑器准备就绪
  const handleEditorReady = (editorInstance: EditorType) => {
    setEditor(editorInstance);
  };

  onCleanup(() => {
    // editor()?.destroy();
  });

  return (
    <>
      {/* Debug切换按钮 */}
      <button class="debug-toggle-btn" onClick={toggleDebug} title={isDebugOpen() ? '关闭调试面板' : '打开调试面板'}>
        🐛
      </button>
      <div class="app-container" classList={{ 'debug-open': isDebugOpen() }}>
        {/* 主内容区域 */}
        <div class="main-content">
          <Show when={editor()}>
            <Toolbar editor={editor as Accessor<EditorType>} />
          </Show>
          <Editor onEditorReady={handleEditorReady} />
        </div>

        {/* Debug侧边栏 */}
        <Show when={editor() && isDebugOpen()}>
          <div class="debug-sidebar">
            <DebugPanel editor={editor as Accessor<EditorType>} />
          </div>
        </Show>
      </div>
    </>
  );
};

export default App;
