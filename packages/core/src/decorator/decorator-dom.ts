import { createElement } from '../utils/dom';
import { WidgetDecorator } from './base-decorator';

export const isWidgetElement = (element: HTMLElement) => {
  return element.classList.contains('editor-widget');
};

export const getWidgetIndexPosition = (element: HTMLElement): 'before' | 'after' => {
  return (element.getAttribute('data-index-position') as 'before' | 'after') ?? 'after';
};

export const canWidgetWrap = (element: HTMLElement) => {
  return element.getAttribute('data-widget-breakable') === 'true';
};

export const createWidgetWrapper = (widgetElement: HTMLElement, widgetDecorator: WidgetDecorator) => {
  const span = createElement('span',  ['editor-widget'], null);
  span.setAttribute('data-widget-type', widgetDecorator.name);

  if (widgetDecorator.options.wrap) {
    span.setAttribute('data-widget-breakable', 'true');
  }

  span.setAttribute('data-index-position', widgetDecorator.options.indexPosition || 'before');

  span.appendChild(widgetElement);

  return span;
};
