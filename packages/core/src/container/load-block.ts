import { Editor } from '../editor/editor';
import { getContainerBlocksElement } from './container-dom';
import { ContainerElement } from '../index.type';

/**
 * 加载容器下的所有块
 */
export function loadBlocks(editor: Editor, container: ContainerElement, containerId: string) {
  const blocks = editor.editorDoc.getContainerBlocks(containerId);
  const fragment = document.createDocumentFragment();

  blocks.forEach((block, index) => {
    const blockElement = editor.editorBlocks.createBlock([{ containerId, blockIndex: index }], container, block);
    fragment.appendChild(blockElement);
  });

  const containerBlocksElement = getContainerBlocksElement(container);
  containerBlocksElement.appendChild(fragment);
}
