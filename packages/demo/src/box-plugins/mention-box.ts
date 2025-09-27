import { BoxInstance, BoxData } from '@ch-editor/core';
import './mention-box.css';

/**
 * 提及数据接口
 */
export interface MentionData {
  /** 被提及的用户ID */
  userId: string;
  /** 被提及的用户名 */
  username: string;
  /** 用户头像URL（可选） */
  avatar?: string;
  /** 用户显示名称（可选，默认使用username） */
  displayName?: string;
}

/**
 * 提及Box实现
 * 用于在编辑器中显示@用户的提及功能
 */
export class MentionBox implements BoxInstance {
  readonly type: string;

  constructor(type: string) {
    this.type = type;
  }

  /**
   * 渲染提及box的DOM元素
   */
  render(data: BoxData): HTMLElement {
    const mentionData = data.data as MentionData;

    // 创建提及容器
    const mentionElement = document.createElement('span');
    mentionElement.className = 'ch-mention-box';
    mentionElement.setAttribute('data-mention-id', data.id);
    mentionElement.setAttribute('data-user-id', mentionData.userId);
    mentionElement.setAttribute('contenteditable', 'false');

    // 创建头像元素（如果有）
    if (mentionData.avatar) {
      const avatarElement = document.createElement('img');
      avatarElement.className = 'ch-mention-avatar';
      avatarElement.src = mentionData.avatar;
      avatarElement.alt = mentionData.username;
      mentionElement.appendChild(avatarElement);
    }

    // 创建用户名元素
    const usernameElement = document.createElement('span');
    usernameElement.className = 'ch-mention-username';
    usernameElement.textContent = `@${mentionData.displayName || mentionData.username}`;
    mentionElement.appendChild(usernameElement);


    // 添加悬停效果
    mentionElement.addEventListener('mouseenter', () => {
      mentionElement.classList.add('ch-mention-hover');
    });

    mentionElement.addEventListener('mouseleave', () => {
      mentionElement.classList.remove('ch-mention-hover');
    });

    return mentionElement;
  }

  /**
   * 销毁box实例
   */
  destroy(): void {
    // 清理事件监听器等资源
    // 由于我们使用的是DOM事件，当元素被移除时会自动清理
  }

  /**
   * 提及box不支持跨行显示
   */
  canWrap(): boolean {
    return true;
  }

  /**
   * 创建提及数据的静态方法
   */
  static createMentionData(userId: string, username: string, options?: {
    avatar?: string;
    displayName?: string;
  }): MentionData {
    return {
      userId,
      username,
      avatar: options?.avatar,
      displayName: options?.displayName
    };
  }

  /**
   * 创建提及BoxData的静态方法
   */
  static createMentionBoxData(id: string, mentionData: MentionData): BoxData {
    return {
      id,
      type: 'mention',
      data: mentionData
    };
  }
}
