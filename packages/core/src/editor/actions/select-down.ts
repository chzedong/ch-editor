import { Editor } from '../editor';
import { findDownPosition } from '../utils/navigation-utils';

export function selectDown(editor: Editor) {
  const range = editor.selection.range;
  const endPos = range.focus;

  const targetPos = findDownPosition(editor, endPos);
  if (targetPos) {
    editor.selection.setSelection(range.anchor, targetPos, { isVerticalNavigation: true });
    // 使用智能滚动确保光标可见
    editor.scrollIntoView();
    return true;
  }

  return false;
}
