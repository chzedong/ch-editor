import { LineBreaker } from './text-line';
import { BlockElement } from '../../index.type';

/**
 * 缓存项接口
 */
interface CacheItem {
  lineBreaker: LineBreaker;
  lastModified: number;
}

/**
 * LineBreaker 缓存管理器
 * 用于缓存 LineBreaker 实例，避免重复创建，提升性能
 */
export class LineBreakerCacheManager {
  private cache = new WeakMap<BlockElement, CacheItem>();

  /**
   * 获取 LineBreaker 实例，优先从缓存获取
   * @param block 块元素
   * @returns LineBreaker 实例
   */
  getLineBreaker(block: BlockElement): LineBreaker {
    const cached = this.cache.get(block);

    if (cached) {
      return cached.lineBreaker;
    }

    // 创建新的 LineBreaker 实例
    const lineBreaker = new LineBreaker(block);
    const cacheItem: CacheItem = {
      lineBreaker,
      lastModified: Date.now()
    };

    // 缓存实例
    this.cache.set(block, cacheItem);

    return lineBreaker;
  }

  /**
   * 手动清除指定块的缓存
   * @param block 块元素
   */
  invalidateCache(block: BlockElement): void {
    const cached = this.cache.get(block);
    if (cached) {
      this.cache.delete(block);
    }
  }
}
