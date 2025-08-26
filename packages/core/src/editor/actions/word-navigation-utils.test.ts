import {
  NavigationElementType,
  getNavigationElementAt,
  editorGetPreWordStart,
  editorGetNextWordEnd,
  registerNavigationElementRecognizer,
  CJKElementRecognizer,
  DecoratorElementRecognizer
} from './word-navigation-utils';
import { DocBlockText } from '../../index.type';
import { createBoxInsertOp } from '../../box/box-data-model';

/**
 * 导航工具函数测试
 * 验证空格、box、文本等不同元素类型的导航行为
 */
describe('NavigationUtils', () => {
  // 创建测试用的box数据
  const createTestBox = (id: string) => ({
    id,
    type: 'mention',
    data: { name: `User${id}` }
  });

  describe('getNavigationElementAt', () => {
    it('should recognize text elements', () => {
      const ops: DocBlockText = [
        { insert: 'hello' }
      ];

      const element = getNavigationElementAt(ops, 0);
      expect(element?.type).toBe(NavigationElementType.TEXT);
    });

    it('should recognize space elements', () => {
      const ops: DocBlockText = [
        { insert: 'hello world' }
      ];

      const element = getNavigationElementAt(ops, 5); // 空格位置
      expect(element?.type).toBe(NavigationElementType.SPACE);
    });

    it('should recognize box elements', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData),
        { insert: ' world' }
      ];

      const element = getNavigationElementAt(ops, 6); // box位置
      expect(element?.type).toBe(NavigationElementType.BOX);
      expect(element?.data).toEqual(boxData);
    });
  });

  describe('editorGetPreWordStart', () => {
    it('should handle text navigation', () => {
      const ops: DocBlockText = [
        { insert: 'hello world test' }
      ];

      // 从 'test' 的 't' 位置向前查找
      const result = editorGetPreWordStart(ops, 12);
      expect(result).toBe(6); // 'world' 的起始位置
    });

    it('should handle box navigation', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData),
        { insert: ' world' }
      ];

      // 从 'world' 的 'w' 位置向前查找
      const result = editorGetPreWordStart(ops, 8);
      expect(result).toBe(7); // box后的位置（box强制隔断）
    });

    it('should handle navigation when cursor is on box - move to box start', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData),
        { insert: ' world' }
      ];

      // 当前在box上，向前应该到box的开头
      const result = editorGetPreWordStart(ops, 6);
      expect(result).toBe(6); // box的开头位置
    });

    it('should handle multiple spaces', () => {
      const ops: DocBlockText = [
        { insert: 'hello   world' }
      ];

      // 从 'world' 的 'w' 位置向前查找
      const result = editorGetPreWordStart(ops, 8);
      expect(result).toBe(0); // 'hello' 的起始位置
    });

    it('should handle mixed content with boxes and spaces', () => {
      const boxData1 = createTestBox('test1');
      const boxData2 = createTestBox('test2');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData1),
        { insert: ' ' },
        createBoxInsertOp(boxData2),
        { insert: ' world' }
      ];

      // 从 'world' 的 'w' 位置向前查找
      const result = editorGetPreWordStart(ops, 10);
      expect(result).toBe(0); // 'hello' 的起始位置
    });
  });

  describe('editorGetNextWordEnd', () => {
    it('should handle text navigation', () => {
      const ops: DocBlockText = [
        { insert: 'hello world test' }
      ];

      // 从 'hello' 的 'h' 位置向后查找
      const result = editorGetNextWordEnd(ops, 0, 16);
      expect(result).toBe(5); // 'hello' 的结束位置
    });

    it('should handle box navigation', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData),
        { insert: ' world' }
      ];

      // 从 'hello' 的 'h' 位置向后查找
      const result = editorGetNextWordEnd(ops, 0, 8);
      expect(result).toBe(5); // 'hello' 的结束位置
    });

    it('should handle navigation when cursor is on box - move to box end', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello ' },
        createBoxInsertOp(boxData),
        { insert: ' world' }
      ];

      // 当前在box上，向后应该到box的结尾
      const result = editorGetNextWordEnd(ops, 6, 8);
      expect(result).toBe(7); // box的结尾位置
    });

    it('should handle box as word boundary', () => {
      const boxData = createTestBox('test1');
      const ops: DocBlockText = [
        { insert: 'hello' },
        createBoxInsertOp(boxData),
        { insert: 'world' }
      ];

      // 从 'world' 的 'w' 位置向前查找，box强制隔断
      const result = editorGetPreWordStart(ops, 6);
      expect(result).toBe(6); // box后的位置

      // 从 'hello' 的 'h' 位置向后查找，box强制隔断
      const result2 = editorGetNextWordEnd(ops, 0, 6);
      expect(result2).toBe(5); // box前的位置
    });

    it('should handle multiple spaces', () => {
      const ops: DocBlockText = [
        { insert: 'hello   world' }
      ];

      // 从 'hello' 的 'h' 位置向后查找
      const result = editorGetNextWordEnd(ops, 0, 13);
      expect(result).toBe(5); // 'hello' 的结束位置
    });
  });

  describe('extensibility', () => {
    it('should support custom recognizers', () => {
      // 注册中日韩字符识别器
      registerNavigationElementRecognizer(new CJKElementRecognizer());

      const ops: DocBlockText = [
        { insert: 'hello 你好 world' }
      ];

      const element = getNavigationElementAt(ops, 6); // '你' 的位置
      expect(element?.type).toBe(NavigationElementType.CJK);
    });

    it('should support decorator recognizers', () => {
      // 注册装饰器识别器
      registerNavigationElementRecognizer(new DecoratorElementRecognizer());

      const ops: DocBlockText = [
        { insert: 'hello\u200Bworld' } // 包含零宽字符
      ];

      const element = getNavigationElementAt(ops, 5); // 零宽字符位置
      expect(element?.type).toBe(NavigationElementType.DECORATOR);
    });
  });
});
