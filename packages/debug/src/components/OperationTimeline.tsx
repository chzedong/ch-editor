import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { OperationRecord, OperationType, OperationSource, OperationFilter } from '../operation-logger/types';
import { OperationLogger } from '../operation-logger/operation-logger';
import '../styles/operation-timeline.css';

export interface OperationTimelineProps {
  logger: OperationLogger;
  maxDisplayCount?: number;
  showFilters?: boolean;
  onOperationClick?: (operation: OperationRecord) => void;
}

/**
 * 操作时间线组件
 * 实时展示用户操作历史，类似Redux DevTools
 */
export const OperationTimeline: Component<OperationTimelineProps> = (props) => {
  const [filter, setFilter] = createSignal<OperationFilter>({});
  const [selectedOperation, setSelectedOperation] = createSignal<OperationRecord | null>(null);
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');

  // 获取过滤后的操作记录
  const filteredOperations = createMemo(() => {
    const records = props.logger.getRecordsSignal();
    const currentFilter = filter();
    const search = searchTerm().toLowerCase();

    let filtered = records;

    // 应用过滤器
    if (currentFilter.types?.length) {
      filtered = filtered.filter(op => currentFilter.types!.includes(op.type));
    }

    if (currentFilter.sources?.length) {
      filtered = filtered.filter(op => currentFilter.sources!.includes(op.source));
    }

    // 应用搜索
    if (search) {
      filtered = filtered.filter(op =>
        op.type.toLowerCase().includes(search) ||
        op.source.toLowerCase().includes(search)
      );
    }

    // 限制显示数量
    const maxCount = props.maxDisplayCount || 100;
    return filtered.slice(-maxCount).reverse(); // 最新的在前面
  });

  // 获取操作类型的颜色
  const getOperationTypeColor = (type: OperationType): string => {
    switch (type) {
    case OperationType.BLOCK_INSERT:
      return '#3b82f6'; // blue
    case OperationType.BLOCK_DELETE:
      return '#f97316'; // orange
    case OperationType.SELECTION_CHANGE:
      return '#8b5cf6'; // purple
    case OperationType.MOUSE_CLICK:
      return '#06b6d4'; // cyan
    case OperationType.KEY_PRESS:
      return '#84cc16'; // lime
    default:
      return '#6b7280'; // gray
    }
  };

  // 获取操作来源的图标
  const getSourceIcon = (source: OperationSource): string => {
    switch (source) {
    case OperationSource.USER:
      return '👤';
    case OperationSource.PROGRAMMATIC:
      return '🤖';
    case OperationSource.SYSTEM:
      return '⚙️';
    case OperationSource.COLLABORATION:
      return '🤝';
    default:
      return '❓';
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // 处理操作点击
  const handleOperationClick = (operation: OperationRecord) => {
    setSelectedOperation(operation);
    props.onOperationClick?.(operation);
  };

  // 切换类型过滤器
  const toggleTypeFilter = (type: OperationType) => {
    const currentFilter = filter();
    const types = currentFilter.types || [];
    const newTypes = types.includes(type)
      ? types.filter(t => t !== type)
      : [...types, type];

    setFilter({ ...currentFilter, types: newTypes.length ? newTypes : undefined });
  };

  // 切换来源过滤器
  const toggleSourceFilter = (source: OperationSource) => {
    const currentFilter = filter();
    const sources = currentFilter.sources || [];
    const newSources = sources.includes(source)
      ? sources.filter(s => s !== source)
      : [...sources, source];

    setFilter({ ...currentFilter, sources: newSources.length ? newSources : undefined });
  };

  // 清空过滤器
  const clearFilters = () => {
    setFilter({});
    setSearchTerm('');
  };

  return (
    <div class="operation-timeline">
      {/* 标题栏 */}
      <div class="timeline-header">
        <div class="timeline-title">
          <button
            class="expand-button"
            onClick={() => setIsExpanded(!isExpanded())}
          >
            {isExpanded() ? '▼' : '▶'}
          </button>
          <span>操作时间线</span>
          <span class="operation-count">({filteredOperations().length})</span>
        </div>

        <div class="timeline-actions">
          <button
            class="clear-button"
            onClick={() => props.logger.clear()}
            title="清空记录"
          >
            🗑️
          </button>
        </div>
      </div>

      <Show when={isExpanded()}>
        {/* 过滤器 */}
        <Show when={props.showFilters !== false}>
          <div class="timeline-filters">
            {/* 搜索框 */}
            <div class="search-box">
              <input
                type="text"
                placeholder="搜索操作..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                class="search-input"
              />
            </div>

            {/* 类型过滤器 */}
            <div class="filter-group">
              <label>操作类型:</label>
              <div class="filter-buttons">
                <For each={Object.values(OperationType)}>
                  {(type) => (
                    <button
                      class={`filter-button ${filter().types?.includes(type) ? 'active' : ''}`}
                      onClick={() => toggleTypeFilter(type)}
                      style={{ 'border-color': getOperationTypeColor(type) }}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* 来源过滤器 */}
            <div class="filter-group">
              <label>操作来源:</label>
              <div class="filter-buttons">
                <For each={Object.values(OperationSource)}>
                  {(source) => (
                    <button
                      class={`filter-button ${filter().sources?.includes(source) ? 'active' : ''}`}
                      onClick={() => toggleSourceFilter(source)}
                    >
                      {getSourceIcon(source)} {source}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* 清空按钮 */}
            <button class="clear-filters-button" onClick={clearFilters}>
              清空过滤器
            </button>
          </div>
        </Show>

        {/* 操作列表 */}
        <div class="timeline-list">
          <For each={filteredOperations()}>
            {(operation) => (
              <div
                class={`timeline-item ${selectedOperation()?.id === operation.id ? 'selected' : ''}`}
                onClick={() => handleOperationClick(operation)}
              >
                {/* 操作头部 */}
                <div class="operation-header">
                  <div class="operation-type">
                    <span
                      class="type-indicator"
                      style={{ 'background-color': getOperationTypeColor(operation.type) }}
                    ></span>
                    <span class="type-name">{operation.type.replace('_', ' ')}</span>
                  </div>

                  <div class="operation-meta">
                    <span class="operation-source">
                      {getSourceIcon(operation.source)}
                    </span>
                    <span class="operation-time">
                      {formatTimestamp(operation.timestamp)}
                    </span>
                  </div>
                </div>

                {/* 操作详情 */}
                <Show when={selectedOperation()?.id === operation.id}>
                  <div class="operation-details">
                    <div class="detail-row">
                      <span class="detail-label">ID:</span>
                      <span class="detail-value">{operation.id}</span>
                    </div>

                    <div class="detail-row">
                      <span class="detail-label">容器:</span>
                      <span class="detail-value">{operation.containerId}</span>
                    </div>

                    <div class="detail-row">
                      <span class="detail-label">块索引:</span>
                      <span class="detail-value">{operation.blockIndex}</span>
                    </div>

                    <Show when={operation.blockId}>
                      <div class="detail-row">
                        <span class="detail-label">块ID:</span>
                        <span class="detail-value">{operation.blockId}</span>
                      </div>
                    </Show>

                    {/* 选区信息 */}
                    <Show when={operation.beforeSelection || operation.afterSelection}>
                      <div class="selection-info">
                        <div class="detail-label">选区变化:</div>
                        <Show when={operation.beforeSelection}>
                          <div class="selection-before">
                            前: {JSON.stringify(operation.beforeSelection, null, 2)}
                          </div>
                        </Show>
                        <Show when={operation.afterSelection}>
                          <div class="selection-after">
                            后: {JSON.stringify(operation.afterSelection, null, 2)}
                          </div>
                        </Show>
                      </div>
                    </Show>

                  </div>
                </Show>
              </div>
            )}
          </For>

          <Show when={filteredOperations().length === 0}>
            <div class="empty-state">
              <div class="empty-icon">📝</div>
              <div class="empty-text">暂无操作记录</div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
