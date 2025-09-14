import { Component, createSignal, For, Show, onMount, onCleanup, Accessor } from 'solid-js';
import { BlockElement, DocObject, Editor, LineBreaker, TextLine } from '@ch-editor/core';
import { LineModelVisualizer } from './LineModelVisualizer';
import { DocInfoPanel } from './DocInfoPanel';
import { BlockRectVisualizer } from './BlockRectVisualizer';
import { OperationLogger } from '../operation-logger/operation-logger';
import { OperationTimeline } from './OperationTimeline';
import { OperationDetails } from './OperationDetails';
import { OperationRecord } from '../operation-logger/types';
import '../styles/debug.css';
import '../styles/components.css';

export interface DebugPanelTab {
  id: string;
  label: string;
  component: Component<any>;
}

export interface DebugPanelProps {
  editor: Accessor<Editor>;
}

/**
 * 调试面板主组件
 * 提供右侧边栏界面，支持多个tab切换
 */
export const DebugPanel: Component<DebugPanelProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal('line-model');
  const [lines, setLines] = createSignal<TextLine[]>([]);
  const [docInfo, setDocInfo] = createSignal<DocObject | null>(null);
  const [blocks, setBlocks] = createSignal<BlockElement[]>([]);
  const [selectedOperation, setSelectedOperation] = createSignal<OperationRecord | null>(null);
  let updateTimer: number | null = null;
  let operationLogger: OperationLogger | null = null;

  const tabs: DebugPanelTab[] = [
    {
      id: 'line-model',
      label: 'Line模型',
      component: () => <LineModelVisualizer lines={lines} />
    },
    {
      id: 'block-rect',
      label: 'Block矩形',
      component: () => <BlockRectVisualizer blocks={blocks} />
    },
    {
      id: 'doc-info',
      label: 'Doc信息',
      component: () => <DocInfoPanel docInfo={docInfo} />
    },
    {
      id: 'operation-timeline',
      label: '操作记录',
      component: () => operationLogger ? (
        <div class="operation-records-panel">
          <div class="operation-timeline-section">
            <OperationTimeline
              logger={operationLogger}
              maxDisplayCount={100}
              showFilters={true}
              onOperationClick={setSelectedOperation}
            />
          </div>
          <div class="operation-details-section">
            <OperationDetails
              operation={selectedOperation()}
              onCollapse={() => setSelectedOperation(null)}
            />
          </div>
        </div>
      ) : <div class="empty-state">操作记录器未初始化</div>
    }
  ];

  const updateDebugInfo = () => {
    const editor = props.editor();
    if (!editor) {
      return;
    }
    // 防抖处理，避免频繁更新
    if (updateTimer) {
      cancelIdleCallback(updateTimer);
    }
    updateTimer = requestIdleCallback(() => {
      try {
        // 更新文档信息
        const docData = editor.editorDoc.getDoc().doc;
        setDocInfo(docData);
        // 更新当前block的line信息
        const blockId = editor.selection.range.start.blockId;
        const block = editor.findBlockById(blockId);

        if (block) {
          const lineBreaker = new LineBreaker(block);
          setLines(lineBreaker.lines as TextLine[]);
        }

        // 获取所有block元素并更新
        const allBlocks: BlockElement[] = editor.getChildBlocks(editor.rootContainer);
        setBlocks(allBlocks);
      } catch (error) {
        console.error('Failed to update debug info:', error);
      }

      updateTimer = null;
    });
  };

  // 将更新方法暴露到组件实例上
  onMount(() => {
    const editor = props.editor();
    if (editor) {
      editor.editorDoc.hooks.register('docChange', updateDebugInfo);
      editor.on('selectionChange', updateDebugInfo);

      operationLogger = new OperationLogger();
      operationLogger.startRecording(editor);
    }
  });

  onCleanup(() => {
    if (operationLogger) {
      operationLogger.stopRecording();
      operationLogger.destroy();
    }
  });

  return (
    <div class={'debug-panel'}>
      {/* 标题栏 */}
      <div class="debug-panel-header">
        <span>CH Editor 调试面板</span>
      </div>

      {/* Tab容器 */}
      <div class="debug-tab-container" role="tablist">
        <For each={tabs}>
          {(tab) => (
            <button
              class={`debug-tab ${activeTab() === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab() === tab.id}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* 内容容器 */}
      <div class="debug-content-container" role="tabpanel">
        <For each={tabs}>
          {(tab) => (
            <Show when={activeTab() === tab.id}>
              <tab.component />
            </Show>
          )}
        </For>
      </div>
    </div>
  );
};
