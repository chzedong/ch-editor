import { type EmbedPlugin } from '@ch-editor/core';

export const twitterEmbedPlugin: EmbedPlugin = {
  type: 'twitter',
  create({ data }) {
    // 简单占位渲染，真实项目可替换为 Tweet oEmbed / iframe 等
    const wrapper = document.createElement('div');
    wrapper.style.border = '1px solid #e1e8ed';
    wrapper.style.borderRadius = '8px';
    wrapper.style.padding = '12px';
    wrapper.style.background = '#f7f9f9';
    wrapper.style.color = '#0f1419';
    wrapper.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.fontSize = '14px';
    wrapper.style.lineHeight = '1.4';

    const title = document.createElement('div');
    title.textContent = 'Twitter Embed';
    title.style.fontWeight = '600';
    title.style.marginBottom = '6px';

    const content = document.createElement('div');
    content.textContent = `Tweet ID: ${data.data?.tweetId ?? 'unknown'}`;

    wrapper.appendChild(title);
    wrapper.appendChild(content);
    return wrapper;
  },
  update({ contentRoot, data }) {
    const content = contentRoot.querySelector('div:nth-child(2)');
    if (content) {
      content.textContent = `Tweet ID: ${data.data?.tweetId ?? 'unknown'}`;
    }
  },
  destroy() {
    // 无特别资源需要清理
  }
};
