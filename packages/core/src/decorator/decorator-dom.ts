

export const isWidgetElement = (element: HTMLElement) => {
  return element.classList.contains('ch-widget');
};

export const getWidgetIndexPosition = (element: HTMLElement): 'before' | 'after' => {
  return (element.getAttribute('data-index-position') as 'before' | 'after') ?? 'after';
};

export const canWidgetWrap = (element: HTMLElement) => {
  return element.classList.contains('ch-widget-wrap');
};
