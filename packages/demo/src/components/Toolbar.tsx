import { Editor, applyMarkToSelection, toggleMark, MentionBox, createEmbedBlockData } from '@ch-editor/core';
import { Component, Accessor, createSignal } from 'solid-js';

interface ToolbarProps {
  editor: Accessor<Editor>;
}

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

/**
 * 工具栏组件
 */
export const Toolbar: Component<ToolbarProps> = (props) => {
  const [selectedUser, setSelectedUser] = createSignal('');

  // 格式化按钮处理函数
  const handleFormat = (format: string) => {
    const editor = props.editor();
    if (!editor) return;

    toggleMark(editor, format);
  };

  // 字体大小变化处理
  const handleFontSizeChange = (size: string) => {
    const editor = props.editor();
    if (!editor) return;

    applyMarkToSelection(editor, 'fontSize', `${parseInt(size)}px`);
  };

  // 颜色变化处理
  const handleColorChange = (color: string, type: 'text' | 'background') => {
    const editor = props.editor();
    if (!editor) return;

    if (type === 'text') {
      applyMarkToSelection(editor, 'color', color);
    } else {
      applyMarkToSelection(editor, 'backgroundColor', color);
    }
  };

  // 插入提及处理
  const handleMention = () => {
    const user = selectedUser();
    const editor = props.editor();

    if (!editor || !user) return;

    const userData = mockUsers[user as keyof typeof mockUsers];
    if (userData) {
      // 创建提及数据
      const mentionData = MentionBox.createMentionData(userData.userId, userData.username, {
        displayName: userData.displayName,
        avatar: userData.avatar
      });

      // 创建提及BoxData
      const boxData = MentionBox.createMentionBoxData(generateId(), mentionData);

      // 插入到编辑器
      editor.insertBox(boxData);

      // 重置选择器
      setSelectedUser('');

      // 重新聚焦编辑器
      editor.focus();
    }
  };

  return (
    <div id="toolbar">
      {/* 格式化按钮 */}
      <button class="toolbar-btn" title="粗体" onClick={() => handleFormat('bold')}>
        B
      </button>

      <button class="toolbar-btn" title="斜体" onClick={() => handleFormat('italic')}>
        I
      </button>

      <button class="toolbar-btn" title="下划线" onClick={() => handleFormat('underline')}>
        U
      </button>

      <button class="toolbar-btn" title="删除线" onClick={() => handleFormat('strikethrough')}>
        S
      </button>

      <button class="toolbar-btn" title="代码" onClick={() => handleFormat('code')}>
        &lt;/&gt;
      </button>

      <button class="toolbar-btn" title="上标" onClick={() => handleFormat('superscript')}>
        x²
      </button>

      <button class="toolbar-btn" title="下标" onClick={() => handleFormat('subscript')}>
        x₂
      </button>

      {/* 颜色选择器 */}
      <input type="color" class="toolbar-btn" title="文字颜色" onInput={(e) => handleColorChange(e.currentTarget.value, 'text')} />

      <input type="color" class="toolbar-btn" title="背景颜色" onInput={(e) => handleColorChange(e.currentTarget.value, 'background')} />

      {/* 字体大小选择 */}
      <select class="toolbar-btn" title="字体大小" onChange={(e) => handleFontSizeChange(e.currentTarget.value)}>
        <option value="12">12px</option>
        <option value="14">14px</option>
        <option value="16">16px</option>
        <option value="18">18px</option>
        <option value="20">20px</option>
        <option value="24">24px</option>
      </select>

      {/* 分隔符 */}
      <div class="toolbar-separator"></div>

      {/* 提及功能 */}
      <button class="toolbar-btn" title="插入提及" onClick={handleMention}>
        @
      </button>

      <select class="toolbar-btn" title="选择用户" value={selectedUser()} onChange={(e) => setSelectedUser(e.currentTarget.value)}>
        <option value="">选择用户...</option>
        <option value="user1">张三</option>
        <option value="user2">李四</option>
        <option value="user3">王五</option>
        <option value="user4">赵六</option>
      </select>

      {/* 插入嵌入块 */}
      <button
        class="toolbar-btn"
        title="插入嵌入块"
        onClick={() => {
          const editor = props.editor();
          if (editor) {
            // 创建嵌入块数据
            const embedData = createEmbedBlockData('twitter', {
              tweetId: '1234567890'
            });

            const focus = editor.selection.range.focus.blockId;
            const blockIndex = editor.editorDoc.getBlockIndexById('root', focus);
            // 插入到编辑器
            editor.insertBlock('root', blockIndex, embedData);
          }
        }}
      >
        插入Twitter嵌入
      </button>
    </div>
  );
};
