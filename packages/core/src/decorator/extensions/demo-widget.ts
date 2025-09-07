import { assert } from '../../main';
import { getDocTextLength } from '../../text/text-op';
import { WidgetDecorator, WidgetRenderContext, WidgetRange } from '../base-decorator';


/**
 * 分隔线Widget装饰器
 * 创建分隔线Widget
 */

export class DividerWidgetDecorator extends WidgetDecorator {
  name: string = 'divider-widget';

  /**
   * 渲染分隔线Widget
   */
  render(data: any): HTMLElement {
    const divider = document.createElement('span');
    divider.className = 'ch-widget-divider';
    divider.innerText = 'hello world';

    return divider;
  }

  /**
   * 计算Widget范围
   */
  calculateWidgetRanges(context: Omit<WidgetRenderContext, 'offset' | 'data'>): WidgetRange[] {
    // 分隔线Widget装饰器不自动计算范围，需要外部管理
    const { blockId, editor } = context;
    const blockData = editor.editorDoc.getBlockById(blockId);
    assert(blockData.text, 'Block not found');
    const textLen = getDocTextLength(blockData.text);

    if (textLen === 0) {
      return [];
    }

    return [{
      position: textLen - 1,
      decorator: this
    }];
  }
}
