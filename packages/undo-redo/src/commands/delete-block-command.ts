import { Editor, assert } from '@ch-editor/core';
import { BaseCommand } from './command';
import { type OperationSnapshot } from '../snapshot-collector';

export class DeleteBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  execute(): void {
    const { containerId, blockIndex, afterSelection } = this.snapshot;
    try {
      this.editor.editorDoc.localDeleteBlock(containerId, blockIndex);
      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('DeleteBlockCommand execute failed:', error);
    }
  }

  undo(): void {
    const { containerId, blockIndex, beforeBlock, beforeSelection } = this.snapshot;
    assert(beforeBlock, 'DeleteBlockCommand: beforeBlock is missing');

    try {
      this.editor.editorDoc.localInsertBlock(containerId, blockIndex, beforeBlock);
      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('DeleteBlockCommand undo failed:', error);
    }
  }
}
