import { Editor } from '../editor/editor';
import { Doc, DocType } from './doc';
import { LifecycleHooks } from './hooks';
import { DefaultHookHandlers } from './default-hooks';
import { EditorSelectionRange } from '../selection/selection-range';

import { BoxData, DocBlock, DocBlockTextActions } from '../index.type';

export class EditorDoc {
  private doc: DocType;
  public readonly hooks: LifecycleHooks; // 公开钩子系统供外部扩展使用

  constructor(private editor: Editor, doc?: DocType) {
    this.doc = doc || new Doc();
    this.hooks = new LifecycleHooks();
    new DefaultHookHandlers(this.editor, this.hooks);
  }

  getDoc(): DocType {
    return this.doc;
  }

  setDoc(doc: DocType): void {
    this.doc = doc;
  }

  getBlockIndexById(container: string, id: string) {
    return this.doc.getBlockIndexById(container, id);
  }

  getBlockByIndex(container: string, index: number) {
    return this.doc.getBlockByIndex(container, index);
  }

  getContainerId(blockId: string) {
    return this.doc.getContainerId(blockId);
  }

  getBlockById(id: string) {
    return this.doc.getBlockById(id);
  }

  getContainerBlocks(containerId: string) {
    return this.doc.getContainerBlocks(containerId);
  }

  getBlockData(containerId: string, blockIndex: number) {
    return this.doc.getBlockData(containerId, blockIndex);
  }

  forEachContainer(callback: (containerId: string) => void) {
    this.doc.forEachContainer(callback);
  }

  forEachBlock(callback: (containerId: string, blockIndex: number, blockData: DocBlock) => void) {
    this.doc.forEachBlock(callback);
  }

  localUpdateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    // 触发before钩子
    this.hooks.trigger('beforeUpdateBlock', {
      containerId,
      blockIndex,
      actions,
      source: 'local'
    });

    // 数据层处理
    const { newText, blockData } = this.doc.updateBlockText(containerId, blockIndex, actions);

    // 触发后置动作hook，让协同服务或其他扩展处理渲染和选区更新
    this.hooks.trigger('afterUpdateBlockText', {
      containerId,
      blockIndex,
      blockData,
      newText,
      actions,
      source: 'local'
    });

    return newText;
  }

  localInsertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    // 触发before钩子
    this.hooks.trigger('beforeInsertBlock', {
      containerId,
      blockIndex,
      blockData,
      source: 'local'
    });

    // 数据层处理
    const insertedBlock = this.doc.insertBlock(containerId, blockIndex, blockData);

    // 触发后置动作hook，让协同服务或其他扩展处理DOM操作和选区设置
    this.hooks.trigger('afterInsertBlock', {
      containerId,
      blockIndex,
      blockData: insertedBlock,
      source: 'local'
    });

    return insertedBlock;
  }

  localDeleteBlock(containerId: string, blockIndex: number, newRange?: EditorSelectionRange) {
    // 触发before钩子
    this.hooks.trigger('beforeDeleteBlock', {
      containerId,
      blockIndex,
      source: 'local'
    });

    // 数据层处理
    const deletedBlock = this.doc.deleteBlock(containerId, blockIndex);

    // 触发后置动作hook，让协同服务或其他扩展处理删除逻辑和选区设置
    this.hooks.trigger('afterDeleteBlock', {
      containerId,
      blockIndex,
      deletedBlock,
      source: 'local',
      newRange
    });

    return deletedBlock;
  }

  localUpdateBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    // 触发before钩子
    this.hooks.trigger('beforeUpdateBlock', {
      containerId,
      blockIndex,
      source: 'local'
    });

    // 数据层处理
    const updatedBlock = this.doc.updateBlock(containerId, blockIndex, blockData);

    // 触发后置动作hook，让协同服务或其他扩展处理渲染和选区更新
    this.hooks.trigger('afterUpdateBlock', {
      containerId,
      blockIndex,
      blockData: updatedBlock,
      source: 'local'
    });

    return updatedBlock;
  }

  // Box 相关方法
  localInsertBox(containerId: string, blockIndex: number, offset: number, boxData: BoxData) {
    // 触发before钩子
    this.hooks.trigger('beforeInsertBox', {
      containerId,
      blockIndex,
      offset,
      boxData,
      source: 'local'
    });

    const result = this.doc.insertBox(containerId, blockIndex, offset, boxData);

    // 触发后置动作hook，让协同服务或其他扩展处理DOM操作和选区设置
    this.hooks.trigger('afterInsertBox', {
      containerId,
      blockIndex,
      newText: result.newText,
      insertAction: result.insertAction,
      source: 'local'
    });

    return result;
  }

  localDeleteBox(containerId: string, blockIndex: number, offset: number) {
    // 触发before钩子
    this.hooks.trigger('beforeDeleteBox', {
      containerId,
      blockIndex,
      offset,
      source: 'local'
    });

    const result = this.doc.deleteBox(containerId, blockIndex, offset);
    const { newText } = result;

    // 触发后置动作hook，让协同服务或其他扩展处理DOM操作和选区设置
    this.hooks.trigger('afterDeleteBox', {
      containerId,
      blockIndex,
      newText,
      source: 'local'
    });

    return result;
  }
}
