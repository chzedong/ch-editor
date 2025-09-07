import { BaseDecorator, DecoratorRenderContext, DecoratorRange } from '../base-decorator';
import { Editor } from '../../main';
import { TextBlockContentChild } from '../../index.type';


/**
 * 搜索高亮装饰器
 * 高亮搜索匹配的文本
 */

export class SearchHighlightDecorator extends BaseDecorator {
  readonly name = 'search-highlight';

  constructor() {
    super({
      priority: 90
    });
  }

  calculateRanges(context: DecoratorRenderContext): DecoratorRange[] {
    const focus = context.editor.selection.range.focus;
    return [{
      start: 0,
      end: focus.offset,
      decorator: this
    }];
  }

  apply(editor: Editor, element: TextBlockContentChild): void {
    element.classList.add('ch-search-highlight');
  }
}
