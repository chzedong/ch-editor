import { Editor, RichText, assert, type DocBlockTextActionOp, type DocBlockTextActions } from '@ch-editor/core';
import { BaseCommand } from './command';
import { type OperationSnapshot } from '../snapshot-collector';

export class UpdateBlockCommand extends BaseCommand {
  constructor(editor: Editor, snapshot: OperationSnapshot) {
    super(editor, snapshot);
  }

  execute(): void {
    const { containerId, blockIndex, afterBlock, afterSelection, beforeBlock } = this.snapshot;

    assert(afterBlock, 'UpdateBlockCommand: afterBlock is missing');
    assert((afterBlock as any).text, 'UpdateBlockCommand: afterBlock text is missing');
    assert(beforeBlock, 'UpdateBlockCommand: beforeBlock is missing');
    assert((beforeBlock as any).text, 'UpdateBlockCommand: beforeBlock text is missing');

    try {
      const delta = RichText.diff((beforeBlock as any).text, (afterBlock as any).text);
      const actions: DocBlockTextActions = delta.ops as DocBlockTextActionOp[];
      this.editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);

      if (afterSelection) {
        this.restoreSelection(afterSelection);
      }
    } catch (error) {
      console.error('UpdateBlockCommand execute failed:', error);
    }
  }

  undo(): void {
    const { containerId, blockIndex, beforeBlock, beforeSelection, afterBlock } = this.snapshot;

    assert(beforeBlock, 'UpdateBlockCommand: beforeBlock is missing');
    assert((beforeBlock as any).text, 'UpdateBlockCommand: beforeBlock text is missing');
    assert(afterBlock, 'UpdateBlockCommand: afterBlock is missing');
    assert((afterBlock as any).text, 'UpdateBlockCommand: afterBlock text is missing');

    try {
      const delta = RichText.diff((afterBlock as any).text, (beforeBlock as any).text);
      const actions: DocBlockTextActions = delta.ops as DocBlockTextActionOp[];
      this.editor.editorDoc.localUpdateBlockText(containerId, blockIndex, actions);

      if (beforeSelection) {
        this.restoreSelection(beforeSelection);
      }
    } catch (error) {
      console.error('UpdateBlockCommand undo failed:', error);
    }
  }
}
