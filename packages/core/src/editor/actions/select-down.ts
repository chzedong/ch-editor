import { Editor } from '../editor';
import { assert } from '../../utils/assert';
import { isTextKindBlock } from '../editor-blocks';
import { findDownPosition } from './navigation-utils';

export function selectDown(editor: Editor) {
  const range = editor.selection.range;
  const endPos = range.focus;
  const block = editor.getBlockById(endPos.blockId);

  assert(isTextKindBlock(editor, block), 'not text kind block');

  const targetPos = findDownPosition(editor, endPos);
  if (targetPos) {
    editor.selection.setSelection(range.anchor, targetPos, true);
    return true;
  }

  return false;
}
