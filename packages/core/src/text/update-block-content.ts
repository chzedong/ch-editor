import { Editor } from '../editor/editor';
import { createElement } from '../utils/dom';
import { getDocTextLength, isEmptyBlockText } from './text-utils';
import { BoxDomUtils } from '../box/box-dom-utils';
import { isBoxOp } from '../box/box-data-model';
import { TextSplitter, TextOpSegment } from '../decorator/text-splitter';

import { BlockPath, DocBlockText } from '../index.type';
import { DecoratorRange, WidgetRange } from '../decorator';
import { assert } from '../main';

export function updateBlockContent(editor: Editor, path: BlockPath, blockId: string, content: Element, blockText: DocBlockText) {
  if (isEmptyBlockText(blockText)) {
    content.innerHTML = '<span><br></span>';
    return;
  }

  const fragment = document.createDocumentFragment();

  const decoratorRanges = editor.decoratorManager.calculateDecoratorRanges(blockId, getDocTextLength(blockText));
  // 计算widget范围
  const widgetRanges = editor.decoratorManager.calculateWidgetRanges(blockId, getDocTextLength(blockText));

  const start = performance.now();
  renderWithDecorators(editor, blockText, decoratorRanges, widgetRanges, fragment);
  console.log('%cRenderTextSegment: %c%s ms', 'color: #2196F3; font-weight: bold', 'color: #4CAF50', (performance.now() - start).toFixed(2));

  content.innerHTML = '';
  content.appendChild(fragment);
}

function renderWithDecorators(
  editor: Editor,
  blockText: DocBlockText,
  decoratorRanges: DecoratorRange[],
  widgetRanges: WidgetRange[],
  fragment: DocumentFragment
) {
  // 使用文本分割器分割文本
  const segments = TextSplitter.splitTextOps(blockText, decoratorRanges, widgetRanges);

  for (const segment of segments) {
    if (segment.isWidget) {
      // 渲染 Widget 元素
      renderWidgetSegment(editor, segment, fragment);
    } else if (segment.isBox) {
      // 渲染 Box 元素
      renderBoxSegment(editor, segment, fragment);
    } else {
      // 渲染文本元素
      renderTextSegment(editor, segment, fragment);
    }
  }
}

/**
 * 渲染Box片段
 */
function renderBoxSegment(editor: Editor, segment: TextOpSegment, fragment: DocumentFragment) {

  assert(segment.originalOp, 'Box segment should have original op');
  // 确保 segment.originalOp 是一个 box 操作
  assert(isBoxOp(segment.originalOp), 'segment original op must be a box operation');
  const boxData = segment.originalOp.attributes.insertBox;

  // 通过 editor-boxes 渲染 box 内容
  const { boxContent, canWrap } = editor.editorBoxes.renderBox(boxData);
  // 使用 BoxDomUtils 创建标准的 box 包装器
  const boxElement = BoxDomUtils.createBoxWrapper(boxData, boxContent, canWrap);

  // 应用装饰器到Box元素
  if (segment.decorators.length > 0) {
    editor.decoratorManager.applyDecorators(boxElement, {
      decorators: segment.decorators,
      segment
    });
  }

  fragment.appendChild(boxElement);
}

/**
 * 渲染文本片段
 */
function renderTextSegment(editor: Editor, segment: TextOpSegment, fragment: DocumentFragment) {
  const span = createElement('span', ['text'], null);

  assert(segment.originalOp, 'Text segment should have original op');
  // 提取片段文本
  const segmentText = segment.originalOp.insert.substring(
    segment.startInOp,
    segment.endInOp
  );
  span.innerText = segmentText;

  // 合并原始属性和装饰器属性
  const mergedAttributes = mergeAttributes(
    segment.originalOp.attributes || {},
    segment.decorators
  );

  // 应用Mark系统
  if (Object.keys(mergedAttributes).length > 0) {
    editor.markManager.applyMarks(span, mergedAttributes);
  }

  // 应用装饰器
  if (segment.decorators.length > 0) {
    editor.decoratorManager.applyDecorators(span, {
      decorators: segment.decorators,
      segment
    });
  }

  fragment.appendChild(span);
}

/**
 * 渲染Widget片段
 */
function renderWidgetSegment(editor: Editor, segment: TextOpSegment, fragment: DocumentFragment) {

  assert(segment.widgetDecorator, 'Widget segment should have widget decorator');

  // 使用widget装饰器渲染widget
  const widgetElement = segment.widgetDecorator.render(segment.widgetData || {});

  const span = createElement('span',  ['ch-widget'], null);
  span.setAttribute('data-widget-type', segment.widgetDecorator.name);
  span.appendChild(widgetElement);

  fragment.appendChild(span);
}

/**
 * 合并原始属性和装饰器属性
 */
function mergeAttributes(
  originalAttributes: any,
  decorators: any[],
  decoratorData?: Map<string, any>
): any {
  const merged = { ...originalAttributes };

  // 装饰器可能会添加一些临时属性到attributes中
  // 这里可以根据需要扩展合并逻辑
  decorators.forEach(decorator => {
    const data = decoratorData?.get(decorator.name);
    if (data && data.attributes) {
      Object.assign(merged, data.attributes);
    }
  });

  return merged;
}
