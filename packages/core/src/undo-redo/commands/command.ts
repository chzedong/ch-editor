import { Editor } from '../../editor/editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { SelectionRangeSnapshot } from '../../selection/selection-range';
import { OperationSnapshot } from '../snapshot-collector';

/**
 * 命令接口 - 实现命令模式
 */
export interface ICommand {
  /**
   * 执行命令（redo操作）
   */
  execute(): void;

  /**
   * 撤销命令（undo操作）
   */
  undo(): void;
}

/**
 * 抽象命令基类
 */
export abstract class BaseCommand implements ICommand {
  protected editor: Editor;
  protected snapshot: OperationSnapshot;

  constructor(editor: Editor, snapshot: OperationSnapshot) {
    this.editor = editor;
    this.snapshot = snapshot;
  }

  abstract execute(): void;
  abstract undo(): void;

  /**
   * 获取快照信息
   */
  protected getSnapshot(): OperationSnapshot {
    return this.snapshot;
  }

  /**
   * 恢复选区状态
   */
  protected restoreSelection(selectionData: SelectionRangeSnapshot): void {
    if (selectionData && selectionData.anchor && selectionData.focus) {
      this.editor.selection.setSelection(
        EditorBlockPosition.fromJSON(selectionData.anchor),
        EditorBlockPosition.fromJSON(selectionData.focus)
      );
    }
  }
}

/**
 * 命令类型枚举
 */
export enum CommandType {
  UPDATE_BLOCK = 'update',
  INSERT_BLOCK = 'insert',
  DELETE_BLOCK = 'delete',
}
