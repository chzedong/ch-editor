import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { DocObject } from '@ch-editor/core';
import { RemoteDoc } from './yjs-doc-model';

/**
 * 文档提供者接口
 */
export interface DocProvider {
  loadInitialDoc(): Promise<DocObject | null> | DocObject | null;
  saveDoc?(docData: DocObject): Promise<void> | void;
  dispose?(): void;
}

/**
 * 基于 YJS 的远程文档提供者
 * 支持 WebSocket 协同编辑和本地存储持久化
 */
export class RemoteDocProvider implements DocProvider {
  private ydoc: Y.Doc;
  private wsProvider: WebsocketProvider | null = null;
  private isConnected = false;
  private remoteDoc: RemoteDoc;

  constructor(private roomName: string = 'default-room', private wsUrl: string = 'ws://localhost:1234') {
    this.ydoc = new Y.Doc();
    this.setupLocalStorage();
    this.connect();

    // 创建 RemoteDoc 实例
    this.remoteDoc = new RemoteDoc(this.ydoc);
  }

  /**
   * 加载初始文档数据
   */
  loadInitialDoc(): DocObject | null {
    // 从 localStorage 加载数据
    const stored = localStorage.getItem('yjs-doc');
    if (stored) {
      try {
        const update = new Uint8Array(JSON.parse(stored));
        Y.applyUpdate(this.ydoc, update);
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }

    return null;
  }

  /**
   * 保存文档数据（YJS 自动同步，这里可以添加额外的保存逻辑）
   */
  saveDoc(docData: DocObject): void {
    if (this.remoteDoc) {
      this.remoteDoc.fromDocObject(docData);
    }
  }

  /**
   * 设置本地存储持久化
   */
  private setupLocalStorage() {
    // 监听文档变化，保存到 localStorage
    this.ydoc.on('update', (update: Uint8Array) => {
      try {
        localStorage.setItem('yjs-doc', JSON.stringify(Array.from(update)));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    });
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect() {
    if (this.wsProvider) {
      this.disconnect();
    }

    this.wsProvider = new WebsocketProvider(this.wsUrl, this.roomName, this.ydoc);

    this.wsProvider.on('status', (event: { status: string }) => {
      this.isConnected = event.status === 'connected';
      console.log('WebSocket status:', event.status);
    });

    this.wsProvider.on('connection-close', () => {
      this.isConnected = false;
      console.log('WebSocket connection closed');
    });

    this.wsProvider.on('connection-error', (error: any) => {
      this.isConnected = false;
      console.error('WebSocket connection error:', error);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
      this.isConnected = false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 设置更新回调
   */
  onUpdate(callback: (docObject: DocObject) => void) {
    // this.onUpdateCallback = callback;
  }

  /**
   * 获取 RemoteDoc 实例
   */
  getRemoteDoc(): RemoteDoc {
    return this.remoteDoc;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.disconnect();
    this.ydoc.destroy();
  }
}
