import { Accessor, Component, createSignal, onCleanup, Show } from 'solid-js';
import { DebugPanel } from '@ch-editor/debug';
import { Editor } from '../components/Editor';
import { Toolbar } from '../components/Toolbar';
import { createDocInstance, LocalDocProvider } from '../local/local-doc-provider';
import './collaborative-style.css';

import { Editor as EditorType } from '@ch-editor/core';

/**
 * 协同编辑应用组件
 */
const CollaborativeApp: Component = () => {
  const [editor, setEditor] = createSignal<EditorType | null>(null);
  const [isDebugOpen, setIsDebugOpen] = createSignal(false);

  const docProvider = new LocalDocProvider();

  const toggleDebug = () => {
    setIsDebugOpen(!isDebugOpen());
  };

  // 处理编辑器准备就绪
  const handleEditorReady = (editorInstance: EditorType) => {
    setEditor(editorInstance);
    editorInstance.editorDoc.hooks.register('docChange', () => {
      docProvider.saveDoc?.(editorInstance.editorDoc.getDoc().doc);
    });
  };

  onCleanup(() => {
    // editor()?.destroy();
  });

  const [isConnected, setIsConnected] = createSignal(false);
  const [collaborators, setCollaborators] = createSignal<string[]>([]);

  // 模拟连接状态切换
  const toggleConnection = () => {
    setIsConnected(!isConnected());
    if (isConnected()) {
      setCollaborators(['用户A', '用户B']);
    } else {
      setCollaborators([]);
    }
  };

  return (
    <>
      {/* 协同编辑头部 */}
      <div class="collaborative-header">
        <div class="header-left">
          <h1>CH Editor - 协同编辑</h1>
          <div class="connection-status">
            <span class={`status-indicator ${isConnected() ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected() ? '已连接' : '离线模式'}</span>
            <button class="connection-toggle" onClick={toggleConnection}>
              {isConnected() ? '断开连接' : '连接协同'}
            </button>
          </div>
        </div>

        <div class="header-right">
          {/* 协作者列表 */}
          <Show when={collaborators().length > 0}>
            <div class="collaborators">
              <span>协作者:</span>
              {collaborators().map((name) => (
                <span class="collaborator-badge">{name}</span>
              ))}
            </div>
          </Show>
        </div>
      </div>
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
          <Editor onEditorReady={handleEditorReady} docProvider={docProvider} createDocInstance={createDocInstance} />
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

export default CollaborativeApp;
