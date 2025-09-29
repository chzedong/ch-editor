import { render } from 'solid-js/web';
import CollaborativeApp from './CollaborativeApp';
import '../style.css';

// check  query string
const queryParams = new URLSearchParams(window.location.search);
const docId = queryParams.get('docId');
if (!docId) {
  // 重定向
  window.location.href = '/collaborative.html?docId=' + Date.now();
}

// 渲染协同编辑应用
const root = document.getElementById('app') as HTMLElement;
render(() => <CollaborativeApp />, root);
