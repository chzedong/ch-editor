import { backspace } from '../editor/actions/backspace';
import { backspaceWord } from '../editor/actions/backspace-word';
import { breakBlock } from '../editor/actions/break-block';
import { moveLeft } from '../editor/actions/move-left';
import { moveRight } from '../editor/actions/move-right';
import { moveUp } from '../editor/actions/move-up';
import { moveDown } from '../editor/actions/move-down';
import { moveWordLeft } from '../editor/actions/move-word-left';
import { moveWordRight } from '../editor/actions/move-word-right';
import { selectLeft } from '../editor/actions/select-left';
import { selectRight } from '../editor/actions/select-right';
import { selectUp } from '../editor/actions/select-up';
import { selectDown } from '../editor/actions/select-down';
import { selectWordLeft } from '../editor/actions/select-word-left';
import { selectWordRight } from '../editor/actions/select-word-right';

export const defaultShortcuts = {
  ArrowRight: moveRight,
  ArrowLeft: moveLeft,
  ArrowUp: moveUp,
  ArrowDown: moveDown,
  'CMDORCTRL+ArrowLeft': moveWordLeft,
  'CMDORCTRL+ArrowRight': moveWordRight,
  'SHIFT+ArrowLeft': selectLeft,
  'SHIFT+ArrowRight': selectRight,
  'SHIFT+ArrowUp': selectUp,
  'SHIFT+ArrowDown': selectDown,
  'CMDORCTRL+SHIFT+ArrowLeft': selectWordLeft,
  'CMDORCTRL+SHIFT+ArrowRight': selectWordRight,
  Backspace: backspace,
  'CMDORCTRL+Backspace': backspaceWord,
  Enter: breakBlock
};
