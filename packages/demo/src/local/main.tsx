import { render } from 'solid-js/web';
import App from './App';
import '../style.css';

// 渲染Solid.js应用
const root = document.getElementById('app') as HTMLElement;
// 渲染应用
render(() => <App />, root);


