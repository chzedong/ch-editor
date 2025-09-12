import { Editor } from '../editor';
import { findUpPosition } from '../utils/navigation-utils';

export function selectUp(editor: Editor) {
  const range = editor.selection.range;
  const startPos = range.focus;

  const targetPos = findUpPosition(editor, startPos);

  if (targetPos) {
    editor.selection.setSelection(range.anchor, targetPos, { isVerticalNavigation: true });
    // 使用智能滚动确保光标可见
    editor.scrollIntoView();
    return true;
  }

  return false;
}
