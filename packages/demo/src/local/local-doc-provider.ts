import { Doc, DocObject } from '@ch-editor/core';
import { DocProvider } from '../doc-providers/doc-provider';

/**
 * 本地存储文档提供者
 * 使用 localStorage 来持久化文档数据
 */
export class LocalDocProvider implements DocProvider {
  private readonly storageKey: string;

  constructor(storageKey: string = 'ch-editor-doc') {
    this.storageKey = storageKey;
  }

  /**
   * 从本地存储加载文档数据
   */
  loadInitialDoc(): DocObject | null {
    try {
      const docData = localStorage.getItem(this.storageKey);
      if (!docData) {
        return null;
      }

      const parsed = JSON.parse(docData);
      // 验证数据格式
      return parsed;
    } catch (error) {
      console.warn('Failed to load document from localStorage:', error);
      return null;
    }
  }

  /**
   * 保存文档数据到本地存储
   * @param docData 要保存的文档数据
   */
  saveDoc(docData: DocObject): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(docData));
    } catch (error) {
      console.warn('Failed to save document to localStorage:', error);
    }
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
export function createDocInstance(docData?: DocObject): Doc {
  return new Doc(docData);
}
