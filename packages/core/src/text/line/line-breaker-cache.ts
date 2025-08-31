import { LineBreaker } from './text-line';
import { BlockElement } from '../../index.type';
import { getBlockContent } from '../../block/block-dom';

/**
 * 缓存项接口
 */
interface CacheItem {
  lineBreaker: LineBreaker;
  lastModified: number;
  observer?: MutationObserver;
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

    // 设置 DOM 变化监听
    this.setupDOMObserver(block, cacheItem);

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
      // 清理观察器
      if (cached.observer) {
        cached.observer.disconnect();
      }
      this.cache.delete(block);
    }
  }

  /**
   * 设置 DOM 变化监听器
   * @param block 块元素
   * @param cacheItem 缓存项
   */
  private setupDOMObserver(block: BlockElement, cacheItem: CacheItem): void {
    // 创建 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
      let shouldInvalidate = false;

      for (const mutation of mutations) {
        // 检查是否有影响布局的变化
        if (this.shouldInvalidateForMutation(mutation)) {
          shouldInvalidate = true;
          break;
        }
      }

      if (shouldInvalidate) {
        this.invalidateCache(block);
      }
    });

    // 监听子节点变化、属性变化和文本内容变化
    const blockContent = getBlockContent(block);
    observer.observe(blockContent, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    cacheItem.observer = observer;
  }

  /**
   * 判断 DOM 变化是否应该使缓存失效
   * @param mutation DOM 变化记录
   * @returns 是否应该失效
   */
  private shouldInvalidateForMutation(mutation: MutationRecord): boolean {
    switch (mutation.type) {
    case 'childList':
      return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;

    case 'characterData':
      // 文本内容变化会影响行布局
      return true;

    case 'attributes':
      // 样式和类名变化可能影响布局
      if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
        return true;
      }
      break;
    }

    return false;
  }
}
