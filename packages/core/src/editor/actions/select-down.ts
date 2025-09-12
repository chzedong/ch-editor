import { Editor } from '../editor';
import { assert } from '../../utils/assert';
import { isTextKindBlock } from '../../text';
import { findDownPosition } from '../utils/navigation-utils';

export function selectDown(editor: Editor) {
  const range = editor.selection.range;
  const endPos = range.focus;
  const block = editor.getBlockById(endPos.blockId);

  assert(isTextKindBlock(editor, block), 'not text kind block');

  const targetPos = findDownPosition(editor, endPos);
  if (targetPos) {
    editor.selection.setSelection(range.anchor, targetPos, { isVerticalNavigation: true });
    // 使用智能滚动确保光标可见
    editor.scrollIntoView();
    return true;
  }

  return false;
}
