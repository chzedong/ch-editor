import { Editor } from '../editor';
import { findUpPosition } from './navigation-utils';

export function selectUp(editor: Editor) {
  const range = editor.selection.range;
  const startPos = range.focus;

  const targetPos = findUpPosition(editor, startPos);

  if (targetPos) {
    editor.selection.setSelection(range.anchor, targetPos, true);
    return true;
  }

  return false;
}
