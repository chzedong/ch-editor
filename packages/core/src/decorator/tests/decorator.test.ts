import { BaseDecorator, SimpleDecorator, SelectionDecorator, DecoratorRenderContext } from '../base-decorator';
import { DecoratorManager } from '../decorator-manager';
import { TextSplitter } from '../text-splitter';
import { SearchHighlightDecorator, SelectionHighlightDecorator } from '../built-in-decorators';
import { DocBlockText } from '../../index.type';

/**
 * 装饰器系统测试套件
 */
describe('Decorator System', () => {
  let mockEditor: any;
  let decoratorManager: DecoratorManager;

  beforeEach(() => {
    // 创建模拟编辑器
    mockEditor = {
      selection: {
        range: {
          start: { blockId: 'block-1', offset: 0 },
          end: { blockId: 'block-1', offset: 10 }
        }
      },
      editorDoc: {
        getBlockData: jest.fn().mockReturnValue({ type: 'text', content: [] })
      }
    };

    decoratorManager = new DecoratorManager(mockEditor);
  });

  describe('BaseDecorator', () => {
    class TestDecorator extends BaseDecorator {
      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled();
      }

      calculateRanges(context: DecoratorRenderContext) {
        return [{
          start: 0,
          end: 5,
          decorator: this
        }];
      }

      apply(element: HTMLElement, context: any) {
        element.classList.add('test-decorator');
        return { success: true };
      }
    }

    it('should create decorator with correct properties', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      
      expect(decorator.name).toBe('test-decorator');
      expect(decorator.getPriority()).toBe(100);
      expect(decorator.isEnabled()).toBe(false);
      expect(decorator.isComposable()).toBe(true);
      expect(decorator.getExcludes()).toEqual([]);
    });

    it('should enable and disable correctly', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      
      expect(decorator.isEnabled()).toBe(false);
      
      decorator.setEnabled(true);
      expect(decorator.isEnabled()).toBe(true);
      
      decorator.setEnabled(false);
      expect(decorator.isEnabled()).toBe(false);
    });

    it('should handle exclusions correctly', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      
      decorator.setExcludes(['other-decorator']);
      expect(decorator.getExcludes()).toEqual(['other-decorator']);
      expect(decorator.excludes('other-decorator')).toBe(true);
      expect(decorator.excludes('different-decorator')).toBe(false);
    });

    it('should notify changes when enabled state changes', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      const changeHandler = jest.fn();
      
      decorator.on('change', changeHandler);
      decorator.setEnabled(true);
      
      expect(changeHandler).toHaveBeenCalledWith(decorator);
    });
  });

  describe('DecoratorManager', () => {
    class TestDecorator extends SimpleDecorator {
      matches(context: DecoratorRenderContext): boolean {
        return this.isEnabled();
      }

      calculateRanges(context: DecoratorRenderContext) {
        return [{
          start: 0,
          end: 5,
          decorator: this
        }];
      }

      apply(element: HTMLElement, context: any) {
        element.classList.add('test-decorator');
        return { success: true };
      }
    }

    it('should register and retrieve decorators', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      
      decoratorManager.register(decorator);
      
      expect(decoratorManager.getDecorator('test-decorator')).toBe(decorator);
      expect(decoratorManager.getAllDecorators()).toContain(decorator);
    });

    it('should unregister decorators', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      
      decoratorManager.register(decorator);
      expect(decoratorManager.getDecorator('test-decorator')).toBe(decorator);
      
      decoratorManager.unregister('test-decorator');
      expect(decoratorManager.getDecorator('test-decorator')).toBeNull();
    });

    it('should handle decorator conflicts', () => {
      const decorator1 = new TestDecorator('decorator-1', 100);
      const decorator2 = new TestDecorator('decorator-2', 90);
      
      decorator1.setExcludes(['decorator-2']);
      decorator1.setEnabled(true);
      decorator2.setEnabled(true);
      
      decoratorManager.register(decorator1);
      decoratorManager.register(decorator2);
      
      const context = {
        blockText: [{ insert: 'Hello World', attributes: {} }],
        path: ['root'],
        blockId: 'block-1',
        editor: mockEditor
      };
      
      const ranges = decoratorManager.calculateDecoratorRanges(context);
      
      // 应该只有高优先级的装饰器被应用
      expect(ranges.length).toBe(1);
      expect(ranges[0].decorator).toBe(decorator1);
    });

    it('should clear all decorators', () => {
      const decorator1 = new TestDecorator('decorator-1', 100);
      const decorator2 = new TestDecorator('decorator-2', 90);
      
      decoratorManager.register(decorator1);
      decoratorManager.register(decorator2);
      
      expect(decoratorManager.getAllDecorators().length).toBe(2);
      
      decoratorManager.clear();
      
      expect(decoratorManager.getAllDecorators().length).toBe(0);
    });

    it('should apply decorators to DOM elements', () => {
      const decorator = new TestDecorator('test-decorator', 100);
      const element = document.createElement('span');
      
      decoratorManager.register(decorator);
      
      const result = decoratorManager.applyDecorators(element, {
        decorators: [decorator],
        decoratorData: new Map(),
        segment: null,
        element
      });
      
      expect(result.success).toBe(true);
      expect(element.classList.contains('test-decorator')).toBe(true);
    });
  });

  describe('TextSplitter', () => {
    it('should split text without decorators', () => {
      const blockText: DocBlockText = [
        { insert: 'Hello ', attributes: {} },
        { insert: 'World', attributes: { bold: true } }
      ];
      
      const segments = TextSplitter.splitTextOps(blockText, []);
      
      expect(segments.length).toBe(2);
      expect(segments[0].originalOp.insert).toBe('Hello ');
      expect(segments[1].originalOp.insert).toBe('World');
    });

    it('should split text with decorator ranges', () => {
      const blockText: DocBlockText = [
        { insert: 'Hello World', attributes: {} }
      ];
      
      const decorator = new SearchHighlightDecorator();
      const decoratorRanges = [{
        start: 6,
        end: 11,
        decorator,
        data: { query: 'World' }
      }];
      
      const segments = TextSplitter.splitTextOps(blockText, decoratorRanges);
      
      expect(segments.length).toBe(2);
      expect(segments[0].globalStart).toBe(0);
      expect(segments[0].globalEnd).toBe(6);
      expect(segments[1].globalStart).toBe(6);
      expect(segments[1].globalEnd).toBe(11);
      expect(segments[1].decorators).toContain(decorator);
    });

    it('should handle overlapping decorator ranges', () => {
      const blockText: DocBlockText = [
        { insert: 'Hello World Test', attributes: {} }
      ];
      
      const decorator1 = new SearchHighlightDecorator();
      const decorator2 = new SelectionHighlightDecorator();
      
      const decoratorRanges = [
        {
          start: 0,
          end: 10,
          decorator: decorator1
        },
        {
          start: 5,
          end: 15,
          decorator: decorator2
        }
      ];
      
      const segments = TextSplitter.splitTextOps(blockText, decoratorRanges);
      
      // 应该被分割为多个片段以处理重叠
      expect(segments.length).toBeGreaterThan(2);
      
      // 检查重叠区域是否包含两个装饰器
      const overlappingSegment = segments.find(s => 
        s.globalStart >= 5 && s.globalEnd <= 10
      );
      
      expect(overlappingSegment).toBeDefined();
      expect(overlappingSegment!.decorators.length).toBe(2);
    });

    it('should handle Box operations', () => {
      const blockText: DocBlockText = [
        { insert: 'Hello ', attributes: {} },
        { insert: '', attributes: { insertBox: { type: 'image', data: {} } } },
        { insert: ' World', attributes: {} }
      ];
      
      const segments = TextSplitter.splitTextOps(blockText, []);
      
      expect(segments.length).toBe(3);
      expect(segments[0].isBox).toBe(false);
      expect(segments[1].isBox).toBe(true);
      expect(segments[2].isBox).toBe(false);
    });
  });

  describe('Built-in Decorators', () => {
    describe('SearchHighlightDecorator', () => {
      let decorator: SearchHighlightDecorator;
      
      beforeEach(() => {
        decorator = new SearchHighlightDecorator();
      });

      it('should create with correct default properties', () => {
        expect(decorator.name).toBe('search-highlight');
        expect(decorator.isEnabled()).toBe(false);
      });

      it('should set and get search query', () => {
        decorator.setSearchQuery('test');
        expect(decorator.getSearchQuery()).toBe('test');
      });

      it('should set and get case sensitivity', () => {
        decorator.setCaseSensitive(true);
        expect(decorator.isCaseSensitive()).toBe(true);
        
        decorator.setCaseSensitive(false);
        expect(decorator.isCaseSensitive()).toBe(false);
      });

      it('should calculate ranges for search matches', () => {
        decorator.setEnabled(true);
        decorator.setSearchQuery('test');
        
        const context = {
          blockText: [{ insert: 'This is a test string with test word', attributes: {} }],
          path: ['root'],
          blockId: 'block-1',
          editor: mockEditor
        };
        
        const ranges = decorator.calculateRanges(context);
        
        expect(ranges.length).toBe(2);
        expect(ranges[0].start).toBe(10);
        expect(ranges[0].end).toBe(14);
        expect(ranges[1].start).toBe(27);
        expect(ranges[1].end).toBe(31);
      });

      it('should handle case sensitivity in search', () => {
        decorator.setEnabled(true);
        decorator.setSearchQuery('Test');
        decorator.setCaseSensitive(true);
        
        const context = {
          blockText: [{ insert: 'This is a test string with Test word', attributes: {} }],
          path: ['root'],
          blockId: 'block-1',
          editor: mockEditor
        };
        
        const ranges = decorator.calculateRanges(context);
        
        expect(ranges.length).toBe(1);
        expect(ranges[0].start).toBe(27);
        expect(ranges[0].end).toBe(31);
      });
    });

    describe('SelectionHighlightDecorator', () => {
      let decorator: SelectionHighlightDecorator;
      
      beforeEach(() => {
        decorator = new SelectionHighlightDecorator();
      });

      it('should create with correct default properties', () => {
        expect(decorator.name).toBe('selection-highlight');
        expect(decorator.isEnabled()).toBe(false);
      });

      it('should calculate ranges based on editor selection', () => {
        decorator.setEnabled(true);
        
        const context = {
          blockText: [{ insert: 'Hello World', attributes: {} }],
          path: ['root'],
          blockId: 'block-1',
          editor: mockEditor
        };
        
        const ranges = decorator.calculateRanges(context);
        
        expect(ranges.length).toBe(1);
        expect(ranges[0].start).toBe(0);
        expect(ranges[0].end).toBe(10);
      });

      it('should not calculate ranges for different blocks', () => {
        decorator.setEnabled(true);
        
        const context = {
          blockText: [{ insert: 'Hello World', attributes: {} }],
          path: ['root'],
          blockId: 'different-block',
          editor: mockEditor
        };
        
        const ranges = decorator.calculateRanges(context);
        
        expect(ranges.length).toBe(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with update-block-content rendering', () => {
      // 这个测试需要实际的DOM环境
      const decorator = new SearchHighlightDecorator();
      decorator.setEnabled(true);
      decorator.setSearchQuery('test');
      
      decoratorManager.register(decorator);
      
      const blockText: DocBlockText = [
        { insert: 'This is a test string', attributes: {} }
      ];
      
      const context = {
        blockText,
        path: ['root'],
        blockId: 'block-1',
        editor: mockEditor
      };
      
      const ranges = decoratorManager.calculateDecoratorRanges(context);
      const segments = TextSplitter.splitTextOps(blockText, ranges);
      
      expect(segments.length).toBe(2);
      expect(segments[1].decorators).toContain(decorator);
    });

    it('should handle complex scenarios with multiple decorators and overlaps', () => {
      const searchDecorator = new SearchHighlightDecorator();
      const selectionDecorator = new SelectionHighlightDecorator();
      
      searchDecorator.setEnabled(true);
      searchDecorator.setSearchQuery('test');
      
      selectionDecorator.setEnabled(true);
      
      decoratorManager.register(searchDecorator);
      decoratorManager.register(selectionDecorator);
      
      const blockText: DocBlockText = [
        { insert: 'This is a test string with test word', attributes: {} }
      ];
      
      const context = {
        blockText,
        path: ['root'],
        blockId: 'block-1',
        editor: mockEditor
      };
      
      const ranges = decoratorManager.calculateDecoratorRanges(context);
      const segments = TextSplitter.splitTextOps(blockText, ranges);
      
      // 应该正确处理多个装饰器的重叠
      expect(segments.length).toBeGreaterThan(2);
      
      // 检查是否有片段包含多个装饰器
      const multiDecoratorSegments = segments.filter(s => s.decorators.length > 1);
      expect(multiDecoratorSegments.length).toBeGreaterThan(0);
    });
  });
});

/**
 * 性能测试
 */
describe('Decorator Performance', () => {
  let decoratorManager: DecoratorManager;
  let mockEditor: any;

  beforeEach(() => {
    mockEditor = {
      selection: {
        range: {
          start: { blockId: 'block-1', offset: 0 },
          end: { blockId: 'block-1', offset: 100 }
        }
      }
    };
    
    decoratorManager = new DecoratorManager(mockEditor);
  });

  it('should handle large text efficiently', () => {
    const decorator = new SearchHighlightDecorator();
    decorator.setEnabled(true);
    decorator.setSearchQuery('test');
    
    decoratorManager.register(decorator);
    
    // 创建大文本
    const largeText = 'test '.repeat(1000);
    const blockText: DocBlockText = [
      { insert: largeText, attributes: {} }
    ];
    
    const context = {
      blockText,
      path: ['root'],
      blockId: 'block-1',
      editor: mockEditor
    };
    
    const startTime = performance.now();
    const ranges = decoratorManager.calculateDecoratorRanges(context);
    const segments = TextSplitter.splitTextOps(blockText, ranges);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    expect(ranges.length).toBe(1000); // 应该找到1000个匹配
  });

  it('should handle many decorators efficiently', () => {
    // 注册多个装饰器
    for (let i = 0; i < 50; i++) {
      const decorator = new SearchHighlightDecorator();
      decorator.name = `search-${i}`;
      decorator.setEnabled(true);
      decorator.setSearchQuery(`test${i}`);
      decoratorManager.register(decorator);
    }
    
    const blockText: DocBlockText = [
      { insert: 'test0 test1 test2 test3 test4', attributes: {} }
    ];
    
    const context = {
      blockText,
      path: ['root'],
      blockId: 'block-1',
      editor: mockEditor
    };
    
    const startTime = performance.now();
    const ranges = decoratorManager.calculateDecoratorRanges(context);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    expect(ranges.length).toBe(5); // 应该找到5个匹配
  });
});