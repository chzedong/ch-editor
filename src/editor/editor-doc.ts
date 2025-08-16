import { Editor } from "./editor";
import { genId } from "../utils/get-id";
import { assert } from "../utils/assert";
import { RichText } from "../text/delta";

import { DocBlock, DocBlockTextActions, DocObject } from "../index.type";
import { transformSelection } from "../selection/selection-utils";

export class EditorDoc {
  doc: DocObject;
  constructor(private editor: Editor, doc?: DocObject) {
    if (doc) {
      this.doc = doc;
    } else {
      this.doc = {
        blocks: [
          {
            id: genId(),
            type: "text",
            text: [{ insert: "" }],
          },
        ],
      };
    }
  }

  getBlockIndexById(container: string, id: string) {
    const blocks = this.getContainerBlocks(container);
    return blocks.findIndex((v) => v.id === id);
  }

  getContainerBlocks(containerId: string) {
    return this.doc.blocks;
  }

  getBlockData(containerId: string, blockIndex: number) {
    const blocks = this.getContainerBlocks(containerId);
    const blockData = blocks[blockIndex];
    assert(blockData, "no block data");
    return blockData;
  }

  localUpdateBlockText(containerId: string, blockIndex: number, actions: DocBlockTextActions) {
    const blockData = this.getBlockData(containerId, blockIndex);
    assert(blockData.text, "no text");
    const newText = RichText.apply(blockData.text, actions);
    blockData.text = newText;
    const block = this.editor.getBlockById(blockData.id);
    this.editor.editorBlocks.getBlockClass("text").setBlockText(this.editor, block, newText);

    const newRange = transformSelection(this.editor, blockData.id, actions);
    this.editor.selection.setSelection(newRange.anchor, newRange.focus);
    return newText;
  }

  localInsertBlock(containerId: string, blockIndex: number, blockData: DocBlock) {
    const blocks = this.getContainerBlocks(containerId);
    blocks.splice(blockIndex, 0, blockData);
  }

  localDeleteBlock(containerId: string, blockIndex: number) {
    const blocks = this.getContainerBlocks(containerId);

    assert(blocks[blockIndex], "no block");

    blocks.splice(blockIndex, 1);
  }
}
