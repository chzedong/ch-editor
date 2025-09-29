import { DocObject } from '@ch-editor/core';

/**
 * 文档提供者接口
 * 为不同的文档存储方式（本地存储、远程服务器等）提供统一的抽象
 */
export interface DocProvider {
  /**
   * 加载初始文档数据
   * @returns 文档对象，如果没有数据则返回 null
   */
  loadInitialDoc(): Promise<DocObject | null> | DocObject | null;

  /**
   * 保存文档数据
   * @param docData 要保存的文档数据
   */
  saveDoc?(docData: DocObject): Promise<void> | void;

  /**
   * 清理资源
   */
  dispose?(): void;
}

/**
 * 文档提供者工厂函数类型
 */
export type DocProviderFactory = () => DocProvider;


