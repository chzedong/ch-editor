import { Editor } from '../editor';
import { findUpPosition } from './navigation-utils';

export function selectUp(editor: Editor) {
  const range = editor.selection.range;
  const startPos = range.start;

  const targetPos = findUpPosition(editor, startPos);

  if (targetPos) {
    editor.selection.setSelection(range.end, targetPos, true);
    return true;
  } else {
    return false;
  }
}
