import { assert } from "../utils/assert";
import { Editor } from "../editor/editor";
import { getParentBlock } from "../block/block-dom";
import { EditorBlockPosition } from "../selection/block-position";

export class RootContainer {
  constructor(private editor: Editor, public rootContainer: HTMLElement) {
    rootContainer.addEventListener("mousedown", this.handleMouseDown);
  }

  handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const { clientX, clientY } = e;

    const ele = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const block = getParentBlock(ele);
    if(!block) {
      return;
    }
    const type = block.getAttribute("data-block-type");
    assert(type, "no type");
    const blockClass = this.editor.editorBlocks.getBlockClass(type);
    const pos = blockClass.getRangeFormPoint(block, clientX, clientY);
    const endPos = new EditorBlockPosition(block.id, pos.offset);
    this.editor.selection.setSelection(pos, endPos);
  };

  destroy() {
    this.rootContainer.removeEventListener("click", this.handleMouseDown);
  }
}