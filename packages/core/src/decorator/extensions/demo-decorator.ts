import { BaseDecorator, DecoratorRenderContext, DecoratorRange } from '../base-decorator';
import { Editor } from '../../main';
import { TextBlockContentChild } from '../../index.type';


/**
 * 搜索高亮装饰器
 * 高亮搜索匹配的文本
 */

export class SearchHighlightDecorator extends BaseDecorator {
  readonly name = 'search-highlight';
  private searchQuery: string = '';
  private caseSensitive: boolean = false;

  constructor() {
    super({
      priority: 90
    });
  }

  /**
   * 设置搜索查询
   */
  setSearchQuery(query: string, caseSensitive: boolean = false): void {
    this.searchQuery = query;
    this.caseSensitive = caseSensitive;
  }

  /**
   * 清除搜索查询
   */
  clearSearch(): void {
    this.searchQuery = '';
  }

  calculateRanges(context: Omit<DecoratorRenderContext, 'element' | 'startOffset' | 'endOffset'>): DecoratorRange[] {
    // if (!this.searchQuery) {
    //   return [];
    // }
    const ranges: DecoratorRange[] = [];
    const { editor, blockId } = context;


    return [{
      start: 0,
      end: 5,
      decorator: this
    }];
    // 获取块的纯文本内容
    // const textContent = this.getBlockTextContent(blockData.text);
    // const searchText = this.caseSensitive ? this.searchQuery : this.searchQuery.toLowerCase();
    // const targetText = this.caseSensitive ? textContent : textContent.toLowerCase();
    // let startIndex = 0;
    // while (true) {
    //   const index = targetText.indexOf(searchText, startIndex);
    //   if (index === -1) break;
    //   ranges.push({
    //     start: index,
    //     end: index + searchText.length,
    //     decorator: this,
    //     data: { query: this.searchQuery }
    //   });
    //   startIndex = index + 1;
    // }
  }

  apply(editor: Editor, element: TextBlockContentChild): void {
    element.classList.add('ch-search-highlight');
    element.setAttribute('search-query', this.searchQuery);
  }
}
