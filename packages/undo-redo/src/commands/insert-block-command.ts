import { Editor, assert } from '@ch-editor/core';
import { BaseCommand } from './command';
import { type OperationSnapshot } from '../snapshot-collector';

export class InsertBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  execute(): void {
    const { containerId, blockIndex, afterBlock, afterSelection } = this.snapshot;
    assert(afterBlock, 'InsertBlockCommand: afterBlock is missing');

    try {
      this.editor.editorDoc.localInsertBlock(containerId, blockIndex, afterBlock);
      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('InsertBlockCommand execute failed:', error);
    }
  }

  undo(): void {
    const { containerId, blockIndex, beforeSelection } = this.snapshot;
    try {
      this.editor.editorDoc.localDeleteBlock(containerId, blockIndex);
      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('InsertBlockCommand undo failed:', error);
    }
  }
}
