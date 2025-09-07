import { assert } from '../../main';
import { getDocTextLength } from '../../text/text-op';
import { DecoratorRenderContext, WidgetDecorator, WidgetRange } from '../base-decorator';


/**
 * 分隔线Widget装饰器
 * 创建分隔线Widget
 */
export class DividerWidgetDecorator extends WidgetDecorator {
  name: string = 'divider-widget';

  constructor() {
    super({
      priority: 90,
      wrap: false,
      indexPosition: 'after'
    });
  }

  /**
   * 渲染分隔线Widget
   */
  render(data: any): HTMLElement {
    const divider = document.createElement('span');
    divider.className = 'ch-widget-divider';
    divider.innerText = 'hello world';
    console.log('data: ', data);
    return divider;
  }

  /**
   * 计算Widget范围
   */
  calculateWidgetRanges(context: DecoratorRenderContext): WidgetRange[] {
    // 分隔线Widget装饰器不自动计算范围，需要外部管理
    const { data, editor } = context;
    const blockData = editor.editorDoc.getBlockById(editor.selection.range.focus.blockId);
    assert(blockData.text, 'Block not found');
    const textLen = getDocTextLength(blockData.text);

    if (textLen === 0) {
      return [];
    }

    return [{
      position: textLen - 1,
      decorator: this,
      data
    }];
  }
}
