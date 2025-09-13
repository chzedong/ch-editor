import { Accessor, Component, createSignal, Show } from 'solid-js';
import { DocObject } from '@ch-editor/core';

export interface DocInfoPanelProps {
  docInfo: Accessor<DocObject | null>;
}

/**
 * Doc信息面板组件
 * 展示文档结构和元数据信息
 */
export const DocInfoPanel: Component<DocInfoPanelProps> = (props) => {
  const [expandedSections, setExpandedSections] = createSignal<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const current = expandedSections();
    const newSet = new Set(current);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    setExpandedSections(newSet);
  };

  const exportJson = () => {
    if (!props.docInfo()) return;

    try {
      const jsonStr = JSON.stringify(props.docInfo(), null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `doc-info-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const renderStructureInfo = () => {
    if (!props.docInfo()) return null;

    const info = props.docInfo() as any;
    const blocks = info.blocks || [];
    const totalBlocks = blocks.length;
    const blockTypes = new Set(blocks.map((block: any) => block.type || 'unknown'));

    return (
      <div class="doc-structure-info">
        <h4>文档结构概览</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">总块数:</span>
            <span class="info-value">{totalBlocks}</span>
          </div>
          <div class="info-item">
            <span class="info-label">块类型:</span>
            <span class="info-value">{Array.from(blockTypes).join(', ')}</span>
          </div>
          <Show when={info.version}>
            <div class="info-item">
              <span class="info-label">版本:</span>
              <span class="info-value">{info.version}</span>
            </div>
          </Show>
          <Show when={info.createdAt}>
            <div class="info-item">
              <span class="info-label">创建时间:</span>
              <span class="info-value">{new Date(info.createdAt).toLocaleString()}</span>
            </div>
          </Show>
        </div>
      </div>
    );
  };

  const renderRawData = () => {
    if (!props.docInfo()) return null;

    try {
      const jsonStr = JSON.stringify(props.docInfo(), null, 2);
      return (
        <div class="doc-raw-data">
          <h4
            class="collapsible-header"
            onClick={() => toggleSection('raw-data')}
          >
            原始数据 {expandedSections().has('raw-data') ? '▼' : '▶'}
          </h4>
          <Show when={expandedSections().has('raw-data')}>
            <pre class="json-display">
              <code innerHTML={escapeHtml(jsonStr)} />
            </pre>
          </Show>
        </div>
      );
    } catch (error) {
      return (
        <div class="doc-raw-data">
          <h4>原始数据</h4>
          <div class="error-message">
            无法序列化数据: {String(error)}
          </div>
        </div>
      );
    }
  };

  return (
    <div class="debug-component">
      <div class="debug-component-title">Doc信息查看</div>

      <div class="debug-component-toolbar">
        <button
          class="debug-button debug-button-success"
          onClick={exportJson}
          disabled={!props.docInfo()}
        >
          导出JSON
        </button>
      </div>

      <div class="debug-component-content doc-info-content">
        <Show
          when={props.docInfo()}
          fallback={
            <div class="empty-state">
              <div class="empty-icon">📄</div>
              <div class="empty-text">暂无Doc信息</div>
              <div class="empty-hint">请在编辑器中进行操作以查看文档信息</div>
            </div>
          }
        >
          {renderStructureInfo()}
          {renderRawData()}
        </Show>
      </div>
    </div>
  );
};
