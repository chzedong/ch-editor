import { Editor } from "../editor/editor";
import { getContainerBlocksElement } from "./container-dom";

export function loadBlocks(editor: Editor, container: HTMLElement, path = []) {
  const containerId = "root";
  const blocks = editor.doc.getContainerBlocks(containerId);
  const fragment = document.createDocumentFragment();

  blocks.forEach((block, index) => {
    const blockElement = editor.editorBlocks.createBlock([{ containerId: "root", blockIndex: index }], container, block);
    fragment.appendChild(blockElement);
  });

  const containerBlocksElement = getContainerBlocksElement(container);
  containerBlocksElement.appendChild(fragment);
}
