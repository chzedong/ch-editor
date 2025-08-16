import { Editor } from './editor';
import { clientType } from '../utils/client';
import { parseShortcut } from '../utils/key';

import { InputHandler, ShortcutsRecord } from '../index.type';

function isMatchKey(key: string, event: KeyboardEvent) {
  const parser = parseShortcut(key);
  if (event.ctrlKey !== parser.ctrl) {
    return false;
  }
  if (event.altKey !== parser.alt) {
    return false;
  }
  if (event.shiftKey !== parser.shift) {
    return false;
  }
  if (parser.cmd !== event.metaKey && clientType.isMac) {
    return false;
  }
  if (parser.key.toLocaleUpperCase() === event.key.toLocaleUpperCase()) {
    return true;
  }
  return false;
}

export class EditorShortcuts implements InputHandler {
  public shortcuts: ShortcutsRecord[] = [];

  handleKeyDown(editor: Editor, event: KeyboardEvent) {
    for (const record of this.shortcuts) {

      for (const [key, callback] of Object.entries(record)) {
        if (isMatchKey(key, event)) {
          if (callback(editor, event)) {
            return true;
          }
        }

      }
    }
    return false;
  }
}