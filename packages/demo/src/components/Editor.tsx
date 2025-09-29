import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { Editor as CoreEditor, DocObject, DocType } from '@ch-editor/core';
import { UndoManager } from '@ch-editor/undo-redo';
import { twitterEmbedPlugin } from '../embed-plugins/twitter';
import { DocProvider } from '../doc-providers/doc-provider';
import { MentionBox } from '../box-plugins/mention-box';

interface EditorProps {
  onEditorReady?: (editor: CoreEditor) => void;
  docProvider: DocProvider;
  createDocInstance: (initDocData?: DocObject) => DocType;
}

/**
 * 编辑器组件
 */
export const Editor: Component<EditorProps> = (props) => {
  const [editorInstance, setEditorInstance] = createSignal<CoreEditor | null>(null);
  let editorContainer: HTMLDivElement | undefined;
  let docProvider: DocProvider;

  onMount(async () => {
    try {
      // 确保容器元素已经被引用
      if (!editorContainer) {
        throw new Error('Editor container not found');
      }

      // 使用传入的文档提供者，或默认使用本地存储提供者
      docProvider = props.docProvider;

      // 加载初始文档数据
      const initDocData = await Promise.resolve(docProvider.loadInitialDoc());
      const initDoc = props.createDocInstance(initDocData ?? void 0);

      // 创建编辑器实例
      const editor = new CoreEditor(editorContainer, {
        initDoc,
        initUndoManager: (editor) => new UndoManager(editor),
        embedPlugins: [twitterEmbedPlugin],
        boxes: {
          mention: MentionBox,
        },
      });

      editor.focus();
      setEditorInstance(editor);

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

    // 清理文档提供者资源
    if (docProvider?.dispose) {
      docProvider.dispose();
    }
  });

  return <div ref={editorContainer} id="editor" />;
};
