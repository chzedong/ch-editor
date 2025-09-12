import { Editor } from '../editor';
import { findDownPosition } from '../utils/navigation-utils';

export function moveDown(editor: Editor) {
  const range = editor.selection.range;
  const focusPos = range.focus;

  const targetPos = findDownPosition(editor, focusPos);
  if (targetPos) {
    editor.selection.setSelection(targetPos, targetPos, { isVerticalNavigation: true });
    // 使用智能滚动确保光标可见
    editor.scrollIntoView();
    return true;
  }

  return false;
}
