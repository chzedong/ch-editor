import { backspace } from "./actions/backspace";
import { backspaceWord } from "./actions/backspace-word";
import { breakBlock } from "./actions/break-block";
import { moveLeft } from "./actions/move-left";
import { moveRight } from "./actions/move-right";
import { moveWordLeft } from "./actions/move-word-left";
import { moveWordRight } from "./actions/move-word-right";
import { selectLeft } from "./actions/select-left";
import { selectRight } from "./actions/select-right";
import { selectWordLeft } from "./actions/select-word-left";
import { selectWordRight } from "./actions/select-word-right";

export const defaultShortcuts = {
  ArrowRight: moveRight,
  ArrowLeft: moveLeft,
  "CMDORCTRL+ArrowLeft": moveWordLeft,
  "CMDORCTRL+ArrowRight": moveWordRight,
  "SHIFT+ArrowLeft": selectLeft,
  "SHIFT+ArrowRight": selectRight,
  "CMDORCTRL+SHIFT+ArrowLeft": selectWordLeft,
  "CMDORCTRL+SHIFT+ArrowRight": selectWordRight,
  Backspace: backspace,
  "CMDORCTRL+Backspace": backspaceWord,
  Enter: breakBlock,
};
