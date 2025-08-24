import { applyMarkToSelection, toggleMark } from '@ch-editor/core';
import { editor } from './bind-editor';


// 工具栏事件处理
function setupToolbar() {
  // 基础格式按钮
  document.getElementById('bold-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'bold');
  });

  document.getElementById('italic-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'italic');
  });

  document.getElementById('underline-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'underline');
  });

  document.getElementById('strikethrough-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'strikethrough');
  });

  document.getElementById('code-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'code');
  });

  document.getElementById('superscript-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'superscript');
  });

  document.getElementById('subscript-btn')?.addEventListener('click', () => {
    toggleMark(editor, 'subscript');
  });

  // 颜色选择器
  const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
  colorPicker?.addEventListener('change', (e) => {
    const color = (e.target as HTMLInputElement).value;
    applyMarkToSelection(editor, 'color', color);
  });

  const bgColorPicker = document.getElementById('bg-color-picker') as HTMLInputElement;
  bgColorPicker?.addEventListener('change', (e) => {
    const color = (e.target as HTMLInputElement).value;
    applyMarkToSelection(editor, 'backgroundColor', color);
  });

  // 字体大小选择器
  const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;
  fontSizeSelect?.addEventListener('change', (e) => {
    const size = (e.target as HTMLSelectElement).value;
    applyMarkToSelection(editor, 'fontSize', `${parseInt(size)}px`);
  });
}
setupToolbar();
