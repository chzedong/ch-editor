import { assert } from '../utils/assert';
import { BoxData, DocBlock, DocBlockTextActions, DocBlockText } from '../index.type';
import { EditorSelectionRange } from '../selection/selection-range';

// 生命周期钩子类型定义
export type HookType =
  | 'beforeUpdateBlock'
  | 'beforeInsertBlock'
  | 'beforeDeleteBlock'
  | 'beforeInsertBox'
  | 'beforeDeleteBox'
  | 'docChange'
  | 'afterUpdateBlockText'
  | 'afterInsertBlock'
  | 'afterDeleteBlock'
  | 'afterInsertBox'
  | 'afterDeleteBox'
  | 'afterUpdateBlock';

// 基础钩子上下文
export interface BaseHookContext {
  containerId: string;
  blockIndex: number;
  // 需要判断操作来源的字段，可能是个枚举类型
  source: 'remote' | 'local'
}

// beforeUpdateBlock 钩子上下文
export interface BeforeUpdateBlockContext extends BaseHookContext {
  actions?: DocBlockTextActions;
}

// beforeInsertBlock 钩子上下文
export interface BeforeInsertBlockContext extends BaseHookContext {
  blockData: DocBlock;
}

// beforeDeleteBlock 钩子上下文
export interface BeforeDeleteBlockContext extends BaseHookContext {
  // 删除操作只需要基础信息
}

// beforeInsertBox 钩子上下文
export interface BeforeInsertBoxContext extends BaseHookContext {
  offset: number;
  boxData: BoxData;
}

// beforeDeleteBox 钩子上下文
export interface BeforeDeleteBoxContext extends BaseHookContext {
  offset: number;
}

// docChange 钩子上下文
export interface DocChangeContext extends BaseHookContext {
  type: 'update' | 'insert' | 'delete' | 'insertBox' | 'deleteBox';
  blockData?: DocBlock;
  offset?: number;
  boxData?: BoxData;
}

// afterUpdateBlockText 钩子上下文
export interface AfterUpdateBlockTextContext extends BaseHookContext {
  blockData: DocBlock;
  newText: DocBlockText;
  actions: DocBlockTextActions;
}

// afterInsertBlock 钩子上下文
export interface AfterInsertBlockContext extends BaseHookContext {
  blockData: DocBlock;
}

// afterDeleteBlock 钩子上下文
export interface AfterDeleteBlockContext extends BaseHookContext {
  deletedBlock: DocBlock;
  newRange?: EditorSelectionRange;
}

// afterInsertBox 钩子上下文
export interface AfterInsertBoxContext extends BaseHookContext {
  newText: DocBlockText;
  insertAction: DocBlockTextActions;
}

// afterDeleteBox 钩子上下文
export interface AfterDeleteBoxContext extends BaseHookContext {
  newText: DocBlockText;
}

// afterUpdateBlock 钩子上下文
export interface AfterUpdateBlockContext extends BaseHookContext {
  blockData: DocBlock;
}

// 钩子上下文类型映射
export interface HookContextMap {
  beforeUpdateBlock: BeforeUpdateBlockContext;
  beforeInsertBlock: BeforeInsertBlockContext;
  beforeDeleteBlock: BeforeDeleteBlockContext;
  beforeInsertBox: BeforeInsertBoxContext;
  beforeDeleteBox: BeforeDeleteBoxContext;
  docChange: DocChangeContext;
  afterUpdateBlockText: AfterUpdateBlockTextContext;
  afterInsertBlock: AfterInsertBlockContext;
  afterDeleteBlock: AfterDeleteBlockContext;
  afterInsertBox: AfterInsertBoxContext;
  afterDeleteBox: AfterDeleteBoxContext;
  afterUpdateBlock: AfterUpdateBlockContext;
}

// 钩子回调函数类型
export type HookCallback<T extends HookType> = (context: HookContextMap[T]) => void;

// 生命周期钩子管理器
export class LifecycleHooks {
  private hooks: Map<HookType, HookCallback<any>[]> = new Map();

  /**
   * 注册钩子回调函数
   */
  register<T extends HookType>(hookType: T, callback: HookCallback<T>): () => void {
    if (!this.hooks.has(hookType)) {
      this.hooks.set(hookType, []);
    }

    const callbacks = this.hooks.get(hookType);
    assert(callbacks, 'callbacks is undefined');
    callbacks.push(callback);

    // 返回取消注册的函数
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 触发钩子
   */
  trigger<T extends HookType>(hookType: T, context: HookContextMap[T]): void {
    const callbacks = this.hooks.get(hookType);
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    // 同步执行所有回调
    callbacks.forEach(callback => {
      try {
        callback(context);
      } catch (error) {
        console.error(`Hook callback error for ${hookType}:`, error);
      }
    });
  }

  /**
   * 清空所有钩子
   */
  clear(): void {
    this.hooks.clear();
  }
}
