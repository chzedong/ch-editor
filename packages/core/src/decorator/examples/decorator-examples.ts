import { Editor } from '../../editor/editor';
import { BaseDecorator, SimpleDecorator, SelectionDecorator, DecoratorRenderContext } from '../base-decorator';
import { DecoratorManager } from '../decorator-manager';
import {
  SelectionHighlightDecorator,
  SearchHighlightDecorator,
  CurrentLineHighlightDecorator,
  ErrorHighlightDecorator,
  CollaborativeCursorDecorator
} from '../built-in-decorators';

/**
 * 装饰器系统使用示例
 */
export class DecoratorExamples {
  private editor: Editor;
  private decoratorManager: DecoratorManager;

  constructor(editor: Editor) {
    this.editor = editor;
    this.decoratorManager = editor.decoratorManager;
  }

  /**
   * 示例1: 使用内置装饰器
   */
  useBuiltInDecorators() {
    // 启用选区高亮装饰器
    const selectionDecorator = this.decoratorManager.getDecorator('selection-highlight');
    if (selectionDecorator) {
      selectionDecorator.setEnabled(true);
    }

    // 启用搜索高亮装饰器
    const searchDecorator = this.decoratorManager.getDecorator('search-highlight') as SearchHighlightDecorator;
    if (searchDecorator) {
      searchDecorator.setEnabled(true);
      searchDecorator.setSearchQuery('example');
      searchDecorator.setCaseSensitive(false);
    }

    // 启用当前行高亮装饰器
    const lineDecorator = this.decoratorManager.getDecorator('current-line-highlight');
    if (lineDecorator) {
      lineDecorator.setEnabled(true);
    }

    // 启用错误高亮装饰器
    const errorDecorator = this.decoratorManager.getDecorator('error-highlight') as ErrorHighlightDecorator;
    if (errorDecorator) {
      errorDecorator.setEnabled(true);
      errorDecorator.addErrorRange({
        start: 10,
        end: 20,
        type: 'spelling',
        message: 'Spelling error detected'
      });
    }

    // 启用协作光标装饰器
    const cursorDecorator = this.decoratorManager.getDecorator('collaborative-cursor') as CollaborativeCursorDecorator;
    if (cursorDecorator) {
      cursorDecorator.setEnabled(true);
      cursorDecorator.addUserCursor({
        userId: 'user-123',
        position: 15,
        color: '#ff6b6b',
        name: 'Alice'
      });
    }
  }

  /**
   * 示例2: 创建自定义简单装饰器
   */
  createCustomSimpleDecorator() {
    class HighlightKeywordDecorator extends SimpleDecorator {
      private keyword: string = '';

      constructor() {
        super('highlight-keyword', 100);
      }

      setKeyword(keyword: string) {
        this.keyword = keyword;
        this.notifyChange();
      }

      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled() && this.keyword.length > 0;
      }

      calculateRanges(context: DecoratorRenderContext) {
        const ranges = [];
        const text = this.getBlockText(context.blockText);
        let index = 0;

        while (index < text.length) {
          const found = text.indexOf(this.keyword, index);
          if (found === -1) break;

          ranges.push({
            start: found,
            end: found + this.keyword.length,
            decorator: this,
            data: { keyword: this.keyword }
          });

          index = found + 1;
        }

        return ranges;
      }

      apply(element: HTMLElement, context: any) {
        element.classList.add('keyword-highlight');
        element.style.backgroundColor = '#fff3cd';
        element.style.border = '1px solid #ffeaa7';
        element.style.borderRadius = '2px';
        element.setAttribute('data-keyword', context.decoratorData?.get(this.name)?.keyword || '');

        return {
          success: true,
          appliedClasses: ['keyword-highlight'],
          appliedStyles: {
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '2px'
          },
          appliedAttributes: {
            'data-keyword': context.decoratorData?.get(this.name)?.keyword || ''
          }
        };
      }
    }

    // 注册并使用自定义装饰器
    const keywordDecorator = new HighlightKeywordDecorator();
    this.decoratorManager.register(keywordDecorator);
    keywordDecorator.setEnabled(true);
    keywordDecorator.setKeyword('important');

    return keywordDecorator;
  }

  /**
   * 示例3: 创建基于选区的装饰器
   */
  createSelectionBasedDecorator() {
    class CommentDecorator extends SelectionDecorator {
      private comments: Map<string, { start: number; end: number; comment: string }> = new Map();

      constructor() {
        super('comment-decorator', 90);
      }

      addComment(id: string, start: number, end: number, comment: string) {
        this.comments.set(id, { start, end, comment });
        this.notifyChange();
      }

      removeComment(id: string) {
        this.comments.delete(id);
        this.notifyChange();
      }

      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled() && this.comments.size > 0;
      }

      calculateRanges(context: DecoratorRenderContext) {
        const ranges = [];

        for (const [id, comment] of this.comments) {
          ranges.push({
            start: comment.start,
            end: comment.end,
            decorator: this,
            data: { commentId: id, comment: comment.comment }
          });
        }

        return ranges;
      }

      apply(element: HTMLElement, context: any) {
        const commentData = context.decoratorData?.get(this.name);
        
        element.classList.add('comment-highlight');
        element.style.backgroundColor = '#e3f2fd';
        element.style.borderBottom = '2px dotted #2196f3';
        element.style.cursor = 'help';
        element.setAttribute('data-comment', commentData?.comment || '');
        element.setAttribute('data-comment-id', commentData?.commentId || '');
        element.title = commentData?.comment || '';

        return {
          success: true,
          appliedClasses: ['comment-highlight'],
          appliedStyles: {
            backgroundColor: '#e3f2fd',
            borderBottom: '2px dotted #2196f3',
            cursor: 'help'
          },
          appliedAttributes: {
            'data-comment': commentData?.comment || '',
            'data-comment-id': commentData?.commentId || '',
            'title': commentData?.comment || ''
          }
        };
      }
    }

    // 注册并使用评论装饰器
    const commentDecorator = new CommentDecorator();
    this.decoratorManager.register(commentDecorator);
    commentDecorator.setEnabled(true);
    commentDecorator.addComment('comment-1', 5, 15, 'This needs review');
    commentDecorator.addComment('comment-2', 25, 35, 'Good implementation');

    return commentDecorator;
  }

  /**
   * 示例4: 装饰器组合和冲突处理
   */
  demonstrateDecoratorConflicts() {
    // 创建两个可能冲突的装饰器
    class RedHighlightDecorator extends SimpleDecorator {
      constructor() {
        super('red-highlight', 80);
        this.setExcludes(['blue-highlight']); // 与蓝色高亮互斥
      }

      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled();
      }

      calculateRanges(context: DecoratorRenderContext) {
        return [{
          start: 0,
          end: 10,
          decorator: this
        }];
      }

      apply(element: HTMLElement, context: any) {
        element.style.backgroundColor = '#ffebee';
        element.style.color = '#c62828';
        return { success: true };
      }
    }

    class BlueHighlightDecorator extends SimpleDecorator {
      constructor() {
        super('blue-highlight', 70); // 优先级低于红色
        this.setExcludes(['red-highlight']); // 与红色高亮互斥
      }

      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled();
      }

      calculateRanges(context: DecoratorRenderContext) {
        return [{
          start: 5,
          end: 15, // 与红色高亮有重叠
          decorator: this
        }];
      }

      apply(element: HTMLElement, context: any) {
        element.style.backgroundColor = '#e3f2fd';
        element.style.color = '#1565c0';
        return { success: true };
      }
    }

    // 注册装饰器
    const redDecorator = new RedHighlightDecorator();
    const blueDecorator = new BlueHighlightDecorator();
    
    this.decoratorManager.register(redDecorator);
    this.decoratorManager.register(blueDecorator);
    
    redDecorator.setEnabled(true);
    blueDecorator.setEnabled(true);

    // 由于红色装饰器优先级更高，在重叠区域只会应用红色装饰器
    console.log('Conflict resolution: Red decorator will take precedence in overlapping areas');

    return { redDecorator, blueDecorator };
  }

  /**
   * 示例5: 动态装饰器管理
   */
  demonstrateDynamicManagement() {
    // 获取所有已注册的装饰器
    const allDecorators = this.decoratorManager.getAllDecorators();
    console.log('Registered decorators:', allDecorators.map(d => d.name));

    // 启用/禁用装饰器
    const searchDecorator = this.decoratorManager.getDecorator('search-highlight');
    if (searchDecorator) {
      console.log('Search decorator enabled:', searchDecorator.isEnabled());
      searchDecorator.setEnabled(!searchDecorator.isEnabled());
      console.log('Search decorator enabled after toggle:', searchDecorator.isEnabled());
    }

    // 注销装饰器
    const customDecorator = this.decoratorManager.getDecorator('highlight-keyword');
    if (customDecorator) {
      this.decoratorManager.unregister('highlight-keyword');
      console.log('Custom decorator unregistered');
    }

    // 清除所有装饰器
    // this.decoratorManager.clear(); // 取消注释以清除所有装饰器
  }

  /**
   * 示例6: 装饰器事件监听
   */
  demonstrateEventListening() {
    // 监听装饰器变化事件
    this.decoratorManager.on('decorator-changed', (decoratorName: string) => {
      console.log(`Decorator ${decoratorName} has changed`);
    });

    this.decoratorManager.on('decorator-registered', (decorator: BaseDecorator) => {
      console.log(`Decorator ${decorator.name} has been registered`);
    });

    this.decoratorManager.on('decorator-unregistered', (decoratorName: string) => {
      console.log(`Decorator ${decoratorName} has been unregistered`);
    });

    // 触发一些变化来演示事件
    const selectionDecorator = this.decoratorManager.getDecorator('selection-highlight');
    if (selectionDecorator) {
      selectionDecorator.setEnabled(!selectionDecorator.isEnabled());
    }
  }

  /**
   * 运行所有示例
   */
  runAllExamples() {
    console.log('=== 装饰器系统示例 ===');
    
    console.log('\n1. 使用内置装饰器');
    this.useBuiltInDecorators();
    
    console.log('\n2. 创建自定义简单装饰器');
    this.createCustomSimpleDecorator();
    
    console.log('\n3. 创建基于选区的装饰器');
    this.createSelectionBasedDecorator();
    
    console.log('\n4. 装饰器冲突处理');
    this.demonstrateDecoratorConflicts();
    
    console.log('\n5. 动态装饰器管理');
    this.demonstrateDynamicManagement();
    
    console.log('\n6. 装饰器事件监听');
    this.demonstrateEventListening();
    
    console.log('\n=== 示例完成 ===');
  }
}

/**
 * 创建并运行装饰器示例
 * @param editor 编辑器实例
 */
export function runDecoratorExamples(editor: Editor) {
  const examples = new DecoratorExamples(editor);
  examples.runAllExamples();
  return examples;
}