import { Editor } from '../editor/editor';
import { Doc, DocType } from './doc';
import { LifecycleHooks } from './hooks';
import { DefaultHookHandlers } from './default-hooks';
import { EditorSelectionRange } from '../selection/selection-range';

import { BoxData, DocBlock, DocBlockText, DocBlockTextActions } from '../index.type';

export class EditorDoc {
  private doc: DocType;
  public readonly hooks: LifecycleHooks; // 公开钩子系统供外部扩展使用

  constructor(private editor: Editor, doc?: DocType) {
    this.doc = doc || new Doc();
    this.hooks = new LifecycleHooks();
    new DefaultHookHandlers(this.editor, this.hooks);

    // 监听doc的所有事件，转发到hooks系统
    this.doc.on('afterUpdateBlockText', this.handleAfterUpdateBlockText);
    this.doc.on('afterInsertBlock', this.handleAfterInsertBlock);
    this.doc.on('afterDeleteBlock', this.handleAfterDeleteBlock);
    this.doc.on('afterUpdateBlock', this.handleAfterUpdateBlock);
    this.doc.on('afterInsertBox', this.handleAfterInsertBox);
    this.doc.on('afterDeleteBox', this.handleAfterDeleteBox);
  }

  /**
   * 处理更新块文本后的后置动作
   */
  private handleAfterUpdateBlockText = (event: { containerId: string; blockIndex: number; blockData: DocBlock; newText: DocBlockText; actions: DocBlockTextActions; source: 'local' | 'remote' }) => {
    this.hooks.trigger('afterUpdateBlockText', event);
  };

  /**
   * 处理插入块后的后置动作
   */
  private handleAfterInsertBlock = (event: { containerId: string; blockIndex: number; blockData: DocBlock; source: 'local' | 'remote' }) => {
    this.hooks.trigger('afterInsertBlock', event);
  };

  /**
   * 处理删除块后的后置动作
   */
  private handleAfterDeleteBlock = (event: { containerId: string; blockIndex: number; deletedBlock: DocBlock; source: 'local' | 'remote'; newRange?: EditorSelectionRange }) => {
    this.hooks.trigger('afterDeleteBlock', event);
  };

  /**
   * 处理更新块后的后置动作
   */
  private handleAfterUpdateBlock = (event: { containerId: string; blockIndex: number; blockData: DocBlock; source: 'local' | 'remote' }) => {
    this.hooks.trigger('afterUpdateBlock', event);
  };

  /**
   * 处理插入box后的后置动作
   */
  private handleAfterInsertBox = (event: { containerId: string; blockIndex: number; offset: number; boxData: BoxData; newText: DocBlockText; insertAction: DocBlockTextActions; source: 'local' | 'remote' }) => {
    this.hooks.trigger('afterInsertBox', event);
  };

  /**
   * 处理删除box后的后置动作
   */
  private handleAfterDeleteBox = (event: { containerId: string; blockIndex: number; offset: number; deletedBoxData: BoxData; newText: DocBlockText; deleteAction: DocBlockTextActions; source: 'local' | 'remote' }) => {
    this.hooks.trigger('afterDeleteBox', event);
  };


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

    // 数据层处理，doc会自动触发afterUpdateBlockText事件
    const { newText, blockData } = this.doc.updateBlockText(containerId, blockIndex, actions);

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

    // 数据层处理，doc会自动触发afterInsertBlock事件
    const insertedBlock = this.doc.insertBlock(containerId, blockIndex, blockData);

    return insertedBlock;
  }

  localDeleteBlock(containerId: string, blockIndex: number, newRange?: EditorSelectionRange) {
    // 触发before钩子
    this.hooks.trigger('beforeDeleteBlock', {
      containerId,
      blockIndex,
      source: 'local'
    });

    // 数据层处理，doc会自动触发afterDeleteBlock事件
    const deletedBlock = this.doc.deleteBlock(containerId, blockIndex);

    return deletedBlock;
  }

  localUpdateBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    // 触发before钩子
    this.hooks.trigger('beforeUpdateBlock', {
      containerId,
      blockIndex,
      source: 'local'
    });

    // 数据层处理，doc会自动触发相应的事件
    const updatedBlock = this.doc.updateBlock(containerId, blockIndex, blockData);

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

    // 数据层处理，doc会自动触发afterInsertBox事件
    const result = this.doc.insertBox(containerId, blockIndex, offset, boxData);

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

    // 数据层处理，doc会自动触发afterDeleteBox事件
    const result = this.doc.deleteBox(containerId, blockIndex, offset);

    return result;
  }
}
