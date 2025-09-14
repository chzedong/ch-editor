import { Component, Show, createMemo, createSignal } from 'solid-js';
import { OperationRecord, OperationType, OperationSource } from '../operation-logger/types';
import '../styles/operation-details.css';

export interface OperationDetailsProps {
  operation: OperationRecord | null;
  onCollapse?: () => void;
}

/**
 * 操作详情面板组件
 * 展示选中操作的详细信息，类似Chrome DevTools的详情面板
 */
export const OperationDetails: Component<OperationDetailsProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(true);

  // 格式化JSON数据
  const formatJson = (data: any): string => {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return `"${data}"`;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    return JSON.stringify(data, null, 2);
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false
    });
  };

  // 获取操作类型的描述
  const getOperationTypeDescription = (type: OperationType): string => {
    switch (type) {
    case OperationType.BLOCK_INSERT:
      return '块插入操作，在文档中插入新的块元素';
    case OperationType.BLOCK_DELETE:
      return '块删除操作，从文档中删除指定的块元素';
    case OperationType.SELECTION_CHANGE:
      return '选区变化操作，用户改变了文本选择范围';
    case OperationType.MOUSE_CLICK:
      return '鼠标点击操作，用户在编辑器中点击了某个位置';
    case OperationType.KEY_PRESS:
      return '按键操作，用户按下了键盘按键';
    case OperationType.FOCUS:
      return '焦点获取操作，编辑器获得焦点';
    case OperationType.BLUR:
      return '焦点失去操作，编辑器失去焦点';
    default:
      return '未知操作类型';
    }
  };

  // 获取操作来源的描述
  const getOperationSourceDescription = (source: OperationSource): string => {
    switch (source) {
    case OperationSource.USER:
      return '用户直接操作，如键盘输入、鼠标点击等';
    case OperationSource.PROGRAMMATIC:
      return '程序化操作，通过API调用触发的操作';
    case OperationSource.SYSTEM:
      return '系统操作，如自动保存、格式化等';
    case OperationSource.COLLABORATION:
      return '协作操作，来自其他用户的实时协作';
    default:
      return '未知操作来源';
    }
  };

  // 计算操作的影响范围
  const getOperationImpact = createMemo(() => {
    const op = props.operation;
    if (!op) return null;

    const impact = {
      scope: '未知',
      // affectedElements: 0,
      dataSize: 0
    };

    // 根据操作类型计算影响范围
    if (op.type.includes('TEXT')) {
      impact.scope = '文本级别';
    } else if (op.type.includes('BLOCK')) {
      impact.scope = '块级别';
    } else if (op.type === OperationType.SELECTION_CHANGE) {
      impact.scope = '选区级别';
    } else {
      impact.scope = '交互级别';
    }

    // 计算数据大小
    const dataStr = JSON.stringify(op);
    impact.dataSize = new Blob([dataStr]).size;

    return impact;
  });

  return (
    <Show when={props.operation}>
      <div class="operation-details-panel">
        {/* 头部 */}
        <div class="details-header">
          <div class="details-title">
            <span class="title-text">操作详情</span>
            <span class="operation-id">#{props.operation!.id}</span>
          </div>
          <div class="header-actions">
            <button class="collapse-button" onClick={() => setIsExpanded(!isExpanded())} title={isExpanded() ? '收起详情' : '展开详情'}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path
                  d={isExpanded() ? 'M3 5l3 3 3-3' : 'M5 3l3 3-3 3'}
                  stroke="currentColor"
                  stroke-width="1.5"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            {props.onCollapse && (
              <button class="close-button" onClick={() => props.onCollapse?.()} title="关闭详情面板">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <Show when={isExpanded()}>
          {/* 基本信息 */}
          <div class="details-section">
            <h3 class="section-title">基本信息</h3>

            <div class="info-grid">
              <div class="info-item">
                <label>操作类型:</label>
                <div class="info-value">
                  <span class="operation-type-badge">{props.operation!.type.replace('_', ' ')}</span>
                  <p class="type-description">{getOperationTypeDescription(props.operation!.type)}</p>
                </div>
              </div>

              <div class="info-item">
                <label>操作来源:</label>
                <div class="info-value">
                  <span class="operation-source-badge">{props.operation!.source}</span>
                  <p class="source-description">{getOperationSourceDescription(props.operation!.source)}</p>
                </div>
              </div>

              <div class="info-item">
                <label>时间戳:</label>
                <div class="info-value">
                  <span class="timestamp">{formatTimestamp(props.operation!.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 位置信息 */}
          <div class="details-section">
            <h3 class="section-title">位置信息</h3>

            <div class="info-grid">
              <div class="info-item">
                <label>容器ID:</label>
                <div class="info-value">
                  <code class="code-value">{props.operation!.containerId}</code>
                </div>
              </div>

              <div class="info-item">
                <label>块索引:</label>
                <div class="info-value">
                  <code class="code-value">{props.operation!.blockIndex}</code>
                </div>
              </div>

              <Show when={props.operation!.blockId}>
                <div class="info-item">
                  <label>块ID:</label>
                  <div class="info-value">
                    <code class="code-value">{props.operation!.blockId}</code>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* 选区信息 */}
          <Show when={props.operation!.beforeSelection || props.operation!.afterSelection}>
            <div class="details-section">
              <h3 class="section-title">选区变化</h3>

              <div class="selection-comparison">
                <Show when={props.operation!.beforeSelection}>
                  <div class="selection-before">
                    <h4>变化前:</h4>
                    <pre class="json-content">{formatJson(props.operation!.beforeSelection)}</pre>
                  </div>
                </Show>

                <Show when={props.operation!.afterSelection}>
                  <div class="selection-after">
                    <h4>变化后:</h4>
                    <pre class="json-content">{formatJson(props.operation!.afterSelection)}</pre>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* 影响分析 */}
          <Show when={getOperationImpact()}>
            <div class="details-section">
              <h3 class="section-title">影响分析</h3>

              <div class="impact-grid">
                <div class="impact-item">
                  <label>影响范围:</label>
                  <span class="impact-value">{getOperationImpact()!.scope}</span>
                </div>

                {/* <div class="impact-item">
                  <label>影响元素:</label>
                  <span class="impact-value">{getOperationImpact()!.affectedElements} 个</span>
                </div> */}

                <div class="impact-item">
                  <label>数据大小:</label>
                  <span class="impact-value">{getOperationImpact()!.dataSize} 字节</span>
                </div>
              </div>
            </div>
          </Show>

          {/* 原始数据 */}
          <div class="details-section">
            <h3 class="section-title">原始数据</h3>

            <div class="raw-data-container">
              <pre class="raw-data-content">{formatJson(props.operation)}</pre>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};
