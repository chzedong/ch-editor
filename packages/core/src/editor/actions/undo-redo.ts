import { Editor } from '../editor';

export const undo = (editor: Editor) => {
  return editor.undoManager.undo();
};

export const redo = (editor: Editor) => {
  return editor.undoManager.redo();
};
