import { clientType } from './client';

export function parseShortcut(shortcut: string) {
  const ret = {
    ctrl: false,
    alt: false,
    shift: false,
    cmd: false,
    key: ''
  };
  //
  const parts = shortcut.toLocaleUpperCase().split('+');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === 'CTRL' || part === 'CONTROL') {
      ret.ctrl = true;
    } else if (part === 'ALT' || part === 'OPTION') {
      ret.alt = true;
    } else if (part === 'SHIFT') {
      ret.shift = true;
    } else if (part === 'CMD' || part === 'COMMAND') {
      ret.cmd = true;
    } else if (part === 'CMDORCTRL' || part === 'CTRLORCMD') {
      //
      if (clientType.isMac) {
        ret.cmd = true;
      } else {
        ret.ctrl = true;
      }
      //
    } else {
      if (part === 'SPACE') {
        ret.key = ' ';
      } else {
        ret.key = part.substring(0, 1) + part.substring(1).toLocaleLowerCase();
      }
    }
  }
  return ret;
}
