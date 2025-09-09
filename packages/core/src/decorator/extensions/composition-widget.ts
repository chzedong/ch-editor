import { Editor } from '../../editor/editor';
import { DecoratorRenderContext, WidgetDecorator, WidgetRange } from '../base-decorator';
import { createElement } from '../../utils/dom';
import { assert } from '../../utils/assert';
import './composition-widget.scss';

/**
 * 合成文本Widget装饰器
 */
export class CompositionWidgetDecorator extends WidgetDecorator {
  name: string = 'composition-widget';

  constructor() {
    super({
      priority: 100, // 高优先级，确保在其他装饰器之上
      wrap: true,
      indexPosition: 'after'
    });
  }

  /**
   * 渲染合成文本Widget
   */
  render(editor: Editor, data?: { compositionText: string; isComposing: boolean }): HTMLElement {
    const compositionSpan = createElement('span', ['composition-text'], null);
    assert(data, 'CompositionWidget data is required');

    compositionSpan.innerText = data.compositionText;
    return compositionSpan;
  }

  /**
   * 计算Widget范围
   */
  calculateWidgetRanges(context: DecoratorRenderContext): WidgetRange[] {
    const { editor } = context;

    // 获取当前输入状态
    const compositionState = editor.input.getCompositionState();

    if (!compositionState.isComposing || !compositionState.compositionText) {
      return [];
    }

    return [{
      position: editor.selection.range.focus.offset,
      decorator: this,
      data: {
        compositionText: compositionState.compositionText,
        isComposing: compositionState.isComposing
      }
    }];
  }
}
