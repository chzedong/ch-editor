/* eslint-disable max-len */
import { init, classModule, styleModule, propsModule, toVNode, attributesModule, datasetModule } from 'snabbdom';

const patch = init([classModule, styleModule, datasetModule, attributesModule, propsModule]);

export function patchNode(oldContent: Node, newContent: Node): void {
  //
  const oldVNode = toVNode(oldContent);
  const newVNode = toVNode(newContent);

  patch(oldVNode, newVNode);
}
