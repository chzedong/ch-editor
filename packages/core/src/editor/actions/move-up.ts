import { Editor } from '../editor';
import { findUpPosition } from '../utils/navigation-utils';

export function moveUp(editor: Editor) {
  const range = editor.selection.range;
  const focusPos = range.focus;

  const targetPos = findUpPosition(editor, focusPos);

  if (targetPos) {
    editor.selection.setSelection(targetPos, targetPos, { isVerticalNavigation: true });
    // 使用智能滚动确保光标可见
    editor.scrollIntoView();
    return true;
  }

  return false;
}
