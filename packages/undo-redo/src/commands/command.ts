import { Editor, EditorBlockPosition, type SelectionRangeSnapshot } from '@ch-editor/core';
import { type OperationSnapshot } from '../snapshot-collector';

export interface ICommand {
  execute(): void;
  undo(): void;
}

export abstract class BaseCommand implements ICommand {
  protected editor: Editor;
  protected snapshot: OperationSnapshot;

  constructor(editor: Editor, snapshot: OperationSnapshot) {
    this.editor = editor;
    this.snapshot = snapshot;
  }

  abstract execute(): void;
  abstract undo(): void;

  protected getSnapshot(): OperationSnapshot {
    return this.snapshot;
  }

  protected restoreSelection(selectionData: SelectionRangeSnapshot): void {
    if (selectionData && selectionData.anchor && selectionData.focus) {
      this.editor.selection.setSelection(
        EditorBlockPosition.fromJSON(selectionData.anchor),
        EditorBlockPosition.fromJSON(selectionData.focus)
      );
    }
  }
}

export enum CommandType {
  UPDATE_BLOCK = 'update',
  INSERT_BLOCK = 'insert',
  DELETE_BLOCK = 'delete',
  GROUP = 'group',
}
