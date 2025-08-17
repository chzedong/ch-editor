import { backspace } from './actions/backspace';
import { backspaceWord } from './actions/backspace-word';
import { breakBlock } from './actions/break-block';
import { moveLeft } from './actions/move-left';
import { moveRight } from './actions/move-right';
import { moveUp } from './actions/move-up';
import { moveDown } from './actions/move-down';
import { moveWordLeft } from './actions/move-word-left';
import { moveWordRight } from './actions/move-word-right';
import { selectLeft } from './actions/select-left';
import { selectRight } from './actions/select-right';
import { selectUp } from './actions/select-up';
import { selectDown } from './actions/select-down';
import { selectWordLeft } from './actions/select-word-left';
import { selectWordRight } from './actions/select-word-right';

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
