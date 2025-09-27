import { Component, onMount, onCleanup, createSignal } from 'solid-js';
import { Doc, Editor as CoreEditor } from '@ch-editor/core';
import { UndoManager } from '@ch-editor/undo-redo';
import { twitterEmbedPlugin } from '../embed-plugins/twitter';
import { MentionBox } from '../box-plugins/mention-box';

interface EditorProps {
  onEditorReady?: (editor: CoreEditor) => void;
}

/**
 * 本地存储键名常量
 */
const STORAGE_KEY = 'ch-editor-doc';

/**
 * 从本地存储加载文档数据
 */
function loadDocFromStorage(): any {
  try {
    const docData = localStorage.getItem(STORAGE_KEY);
    return docData ? JSON.parse(docData) : null;
  } catch (error) {
    console.warn('Failed to load document from localStorage:', error);
    return null;
  }
}

/**
 * 保存文档数据到本地存储
 */
function saveDocToStorage(docData: any): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docData));
  } catch (error) {
    console.error('Failed to save document to localStorage:', error);
  }
}

/**
 * 编辑器组件
 */
export const Editor: Component<EditorProps> = (props) => {
  const [editorInstance, setEditorInstance] = createSignal<CoreEditor | null>(null);
  let editorContainer: HTMLDivElement | undefined;

  onMount(() => {
    try {
      // 确保容器元素已经被引用
      if (!editorContainer) {
        throw new Error('Editor container not found');
      }

      // 加载初始文档数据
      const initDoc = loadDocFromStorage();

      // 创建编辑器实例
      const editor = new CoreEditor(editorContainer, {
        initDoc: new Doc(initDoc),
        initUndoManager: (editor) => new UndoManager(editor),
        embedPlugins: [twitterEmbedPlugin],
        boxes: {
          mention: MentionBox,
        },
      });

      editor.focus();
      setEditorInstance(editor);

      // 设置事件监听
      const docChangeHandler = () => {
        saveDocToStorage(editor.editorDoc.getDoc().doc);
      };

      editor.editorDoc.hooks.register('docChange', docChangeHandler);

      // 将编辑器实例暴露到全局（仅用于调试）
      if (typeof window !== 'undefined') {
        (window as any).editor = editor;
      }

      // 通知父组件编辑器已准备就绪
      props.onEditorReady?.(editor);

      console.log('Editor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize editor:', error);
    }
  });

  onCleanup(() => {
    const editor = editorInstance();
    if (editor) {
      // 清理事件监听器
      editor.unmount();
    }
  });

  return <div ref={editorContainer} id="editor" />;
};
