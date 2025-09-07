import { applyMarkToSelection, toggleMark } from '@ch-editor/core';
import { editor } from './bind-editor';
import { MentionBox } from '@ch-editor/core';

// 生成唯一ID的工具函数
function generateId(): string {
  return 'mention_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 模拟用户数据
const mockUsers = {
  user1: {
    userId: 'user1',
    username: 'zhangsan',
    displayName: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan'
  },
  user2: {
    userId: 'user2',
    username: 'lisi',
    displayName: '李四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi'
  },
  user3: {
    userId: 'user3',
    username: 'wangwu',
    displayName: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu'
  },
  user4: {
    userId: 'user4',
    username: 'zhaoliu',
    displayName: '赵六',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu'
  }
};


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

  // 提及功能
  const mentionBtn = document.getElementById('mention-btn');
  const mentionUserSelect = document.getElementById('mention-user-select') as HTMLSelectElement;

  // 点击@按钮时，显示用户选择下拉框
  mentionBtn?.addEventListener('click', () => {
    mentionUserSelect.focus();
    mentionUserSelect.click();
  });

  // 选择用户时插入提及
  mentionUserSelect?.addEventListener('change', (e) => {
    const selectedUserId = (e.target as HTMLSelectElement).value;
    if (selectedUserId && mockUsers[selectedUserId as keyof typeof mockUsers]) {
      const userData = mockUsers[selectedUserId as keyof typeof mockUsers];

      // 创建提及数据
      const mentionData = MentionBox.createMentionData(
        userData.userId,
        userData.username,
        {
          displayName: userData.displayName,
          avatar: userData.avatar
        }
      );

      // 创建提及BoxData
      const boxData = MentionBox.createMentionBoxData(
        generateId(),
        mentionData
      );

      // 插入到编辑器
      editor.insertBox(boxData);

      // 重置选择器
      mentionUserSelect.value = '';

      // 重新聚焦编辑器
      editor.focus();
    }
  });
}
setupToolbar();
