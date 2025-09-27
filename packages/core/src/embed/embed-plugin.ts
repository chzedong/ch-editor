import { Editor } from '../editor/editor';
import { BlockElement, BlockPath, DocEmbedBlock } from '../index.type';

export interface EmbedRenderContext {
  editor: Editor;
  path: BlockPath;
  blockElement: BlockElement;
  data: DocEmbedBlock;
  /** 基座创建的内容根节点，插件在此节点内渲染自身 */
  contentRoot: HTMLElement;
}

export interface EmbedPlugin {
  /** 插件的 embed 类型标识，例如 'twitter' | 'video' */
  type: string;
  /** 初次创建渲染，返回的元素会被追加到 contentRoot（也可直接操作 contentRoot 返回 void） */
  create(ctx: EmbedRenderContext): HTMLElement | void;
  /** 数据或状态更新时的渲染 */
  update?(ctx: EmbedRenderContext): void;
  /** 删除前的清理逻辑 */
  destroy?(ctx: EmbedRenderContext): void;
}
