import { DocObject } from '@ch-editor/core';
import { DocProvider } from '../doc-providers/doc-provider';
import { RemoteDoc } from './remote-doc';

/**
 * 使用 localStorage 来持久化文档数据
 */
export class RemoteDocProvider implements DocProvider {

  constructor() {
  }

  /**
   * 从本地存储加载文档数据
   */
  loadInitialDoc(): DocObject | null {
    return null;
  }

  /**
   * 清理资源（本地存储提供者无需特殊清理）
   */
  dispose(): void {
    // 本地存储提供者无需特殊清理
  }
}

/**
 * 创建 Doc 实例的辅助函数
 * @param docData 文档数据，可以为 null
 * @returns Doc 实例
 */
export function createDocInstance(docData?: DocObject) {
  return new RemoteDoc(docData);
}
