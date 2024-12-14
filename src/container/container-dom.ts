import { Editor } from "../editor/editor";
import { assert } from "../utils/assert";

export function getContainerBlocksElement(container: HTMLElement) {
  return container.querySelector(":scope > .container-blocks") as HTMLElement;
}

export const getParentContainer = (block: HTMLElement) => {
  const container = block.closest("div[data-type=editor-container]");
  assert(container, "failed to get block container");
  return container as HTMLElement;
};

export const getChildBlocks = (container: HTMLElement) => {
  const blocks = container.querySelectorAll(":scope > .container-blocks > div[data-type=editor-block]");
  return Array.from(blocks) as HTMLElement[];
};

export const getContainerId = (container: HTMLElement) => {
  const id = container.getAttribute("data-container-id");
  assert(id, "avalid container");
  return id;
};

export const getContainerById = (editor: Editor, id: string) => {
  const rootId = getContainerId(editor.rootContainer);
  if (rootId === id) {
    return editor.rootContainer;
  }
  const container = editor.rootContainer.querySelector(`div[data-container-id=${id}]`);
  assert(container, "no container");
  return container as HTMLElement;
};
