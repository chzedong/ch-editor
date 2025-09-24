# YJS DocObject 演示

基于你的 DocObject 数据模型的 YJS 协同编辑演示项目。

## 功能特性

- ✅ **基于 DocObject 的数据建模**: 使用 Y.Array 和 Y.Map 构建 blocks 结构
- ✅ **完整的读写 API**: 支持添加、删除、更新 blocks 和 block 内容
- ✅ **实时数据可视化**: 直观显示 YJS 文档状态和变化
- ✅ **本地存储**: 自动保存到 localStorage
- ✅ **协同编辑**: 支持多客户端实时同步（可选）
- ✅ **块级操作**: 支持段落、标题、嵌入块等多种类型

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 启动演示（本地模式）

```bash
# 启动开发服务器
pnpm --filter @ch-editor/yjs-demo dev
```

访问 http://localhost:3001 查看演示。

### 3. 启动协同模式（可选）

如果要体验多客户端协同编辑：

```bash
# 同时启动 WebSocket 服务器和前端
pnpm --filter @ch-editor/yjs-demo run dev:full
```

然后在多个浏览器窗口中打开 http://localhost:3001，修改界面上的 WebSocket 设置并连接。

## 使用说明

### 界面功能

1. **连接控制**
   - 连接/断开 YJS
   - 清空文档
   - 显示连接状态

2. **块操作**
   - 添加新块（段落、标题、嵌入块）
   - 更新选中块内容
   - 删除选中块

3. **数据可视化**
   - 实时显示 YJS 文档结构
   - 显示文档统计信息
   - 块级详细信息

### 快捷键

- `Ctrl/Cmd + Enter`: 添加新块
- `Ctrl/Cmd + Shift + Delete`: 删除选中块

### API 使用示例

```typescript
import { DocApi } from './api/doc-api';

// 创建 API 实例
const docApi = new DocApi({
  enableWebsocket: false,
  roomName: 'my-room'
});

// 初始化
await docApi.initialize();

// 添加段落
const paragraphId = docApi.addParagraph('这是一个段落');

// 添加标题
const headingId = docApi.addHeading('这是标题', 1);

// 添加代码块
const codeId = docApi.addCodeBlock('console.log("Hello");', 'javascript');

// 更新内容
docApi.updateBlockContent(paragraphId, '更新后的段落内容');

// 删除块
docApi.deleteBlock(codeId);

// 监听文档变化
docApi.onDocumentUpdate(() => {
  console.log('文档已更新');
});
```

## 数据模型

### YJS 结构

```
Y.Doc
└── blocks: Y.Array<Y.Map>
    ├── block1: Y.Map
    │   ├── type: string
    │   ├── id: string
    │   ├── text: Y.Array<Y.Map> (DocBlockTextOp[])
    │   └── ...attributes
    ├── block2: Y.Map
    └── ...
```

### DocObject 映射

```typescript
interface DocObject {
  blocks: DocBlock[];
}

interface DocBlock {
  type: string;
  id: string;
  text?: DocBlockText;
  [key: string]: any;
}

type DocBlockText = DocBlockTextOp[];

interface DocBlockTextOp {
  insert: string;
  attributes?: AttributeMap;
}
```

## 协同功能

### 本地模式
- 数据自动保存到 localStorage
- 页面刷新后数据保持

### WebSocket 模式
- 多客户端实时同步
- 支持用户状态感知
- 自动冲突解决

## 开发

### 项目结构

```
src/
├── models/
│   └── yjs-doc-model.ts      # YJS 数据模型
├── collaboration/
│   └── yjs-provider.ts       # 协同提供者
├── api/
│   └── doc-api.ts           # 文档操作 API
└── main.ts                  # 主应用逻辑
```

### 扩展功能

1. **添加新的块类型**:
   - 在 `DocApi.addBlock()` 中添加新类型处理
   - 更新可视化界面显示逻辑

2. **自定义协同功能**:
   - 修改 `YjsProvider` 配置
   - 添加用户状态管理

3. **数据持久化**:
   - 集成数据库存储
   - 添加版本历史功能

## 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 确保服务器正在运行 (`npm run server`)
   - 检查端口 1234 是否被占用
   - 可以使用本地模式继续开发

2. **数据丢失**
   - 检查 localStorage 是否被清除
   - 确保浏览器支持 localStorage

3. **类型错误**
   - 确保 @ch-editor/core 包已正确构建
   - 运行 `pnpm build:core` 重新构建

### 调试

在浏览器控制台中可以访问全局变量进行调试：

```javascript
// 查看当前文档
console.log(window.docApi?.getDocument());

// 查看统计信息
console.log(window.docApi?.getDocumentStats());
```

## 许可证

MIT License