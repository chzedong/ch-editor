import Delta from "quill-delta";
import { DocBlockText, DocBlockTextActionOp, DocBlockTextActions } from "../index.type";

function applyOps(snapshot: DocBlockText, delta: DocBlockTextActions) {
  const snapshotD = new Delta(snapshot);
  const deltaD = new Delta(delta);
  return snapshotD.compose(deltaD).ops as DocBlockText;
}

export class RichText {
  static apply(text: DocBlockText, ops: DocBlockTextActions) {
    const resultText = applyOps(text, ops)
    return resultText;
  }

  static transformCursor(cursor: number, ops: DocBlockTextActions) {
    return new Delta(ops).transformPosition(cursor);
  }
}

(window as any).RichText = RichText;