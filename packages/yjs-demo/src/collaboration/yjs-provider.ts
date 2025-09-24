import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { YjsDocModel } from '../models/yjs-doc-model';

export interface CollaborationConfig {
  websocketUrl?: string;
  roomName?: string;
  enableWebsocket?: boolean;
  enableLocalStorage?: boolean;
}

export class YjsProvider {
  private docModel: YjsDocModel;
  private websocketProvider?: WebsocketProvider;
  private config: CollaborationConfig;
  private isConnected: boolean = false;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private updateListeners: Array<() => void> = [];

  constructor(docModel: YjsDocModel, config: CollaborationConfig = {}) {
    this.docModel = docModel;
    this.config = {
      websocketUrl: 'ws://localhost:1234',
      roomName: 'yjs-doc-demo',
      enableWebsocket: false,
      enableLocalStorage: true,
      ...config
    };

    this.setupLocalStorage();
    this.setupDocumentObserver();
  }

  /**
   * 连接到协同服务
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.config.enableWebsocket && this.config.websocketUrl && this.config.roomName) {
          this.websocketProvider = new WebsocketProvider(
            this.config.websocketUrl,
            this.config.roomName,
            this.docModel.ydoc
          );

          this.websocketProvider.on('status', (event: { status: string }) => {
            const connected = event.status === 'connected';
            this.isConnected = connected;
            this.notifyConnectionChange(connected);

            if (connected) {
              resolve();
            }
          });

          this.websocketProvider.on('connection-error', (error: any) => {
            console.error('WebSocket connection error:', error);
            this.isConnected = false;
            this.notifyConnectionChange(false);
            reject(error);
          });

          // 设置超时
          setTimeout(() => {
            if (!this.isConnected) {
              console.warn('WebSocket connection timeout, falling back to local mode');
              this.isConnected = true;
              this.notifyConnectionChange(true);
              resolve();
            }
          }, 3000);
        } else {
          // 本地模式
          this.isConnected = true;
          this.notifyConnectionChange(true);
          resolve();
        }
      } catch (error) {
        console.error('Failed to connect:', error);
        this.isConnected = false;
        this.notifyConnectionChange(false);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.websocketProvider) {
      this.websocketProvider.destroy();
      this.websocketProvider = undefined;
    }

    this.isConnected = false;
    this.notifyConnectionChange(false);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 添加连接状态监听器
   */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * 添加文档更新监听器
   */
  onDocumentUpdate(listener: () => void): () => void {
    this.updateListeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = this.updateListeners.indexOf(listener);
      if (index > -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取协同用户信息（如果支持）
   */
  getAwareness() {
    return this.websocketProvider?.awareness;
  }

  /**
   * 设置本地用户信息
   */
  setLocalUser(user: { name: string; color: string; cursor?: any }) {
    const awareness = this.getAwareness();
    if (awareness) {
      awareness.setLocalStateField('user', user);
    }
  }

  /**
   * 获取所有在线用户
   */
  getOnlineUsers(): Array<{ clientId: number; user: any }> {
    const awareness = this.getAwareness();
    if (!awareness) return [];

    const users: Array<{ clientId: number; user: any }> = [];
    awareness.getStates().forEach((state: any, clientId: number) => {
      if (state.user) {
        users.push({ clientId, user: state.user });
      }
    });

    return users;
  }

  /**
   * 设置本地存储
   */
  private setupLocalStorage(): void {
    if (!this.config.enableLocalStorage) return;

    // 从本地存储加载数据
    const storageKey = `yjs-doc-${this.config.roomName || 'default'}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      try {
        const uint8Array = new Uint8Array(JSON.parse(savedData));
        Y.applyUpdate(this.docModel.ydoc, uint8Array);
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }

    // 监听文档变化并保存到本地存储
    this.docModel.ydoc.on('update', (update: Uint8Array) => {
      try {
        const updateArray = Array.from(update);
        localStorage.setItem(storageKey, JSON.stringify(updateArray));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    });
  }

  /**
   * 设置文档观察者
   */
  private setupDocumentObserver(): void {
    this.docModel.ydoc.on('update', () => {
      this.notifyDocumentUpdate();
    });

    this.docModel.blocks.observe(() => {
      this.notifyDocumentUpdate();
    });
  }

  /**
   * 通知连接状态变化
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * 通知文档更新
   */
  private notifyDocumentUpdate(): void {
    this.updateListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in update listener:', error);
      }
    });
  }

  /**
   * 清除本地存储
   */
  clearLocalStorage(): void {
    const storageKey = `yjs-doc-${this.config.roomName || 'default'}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * 导出文档状态
   */
  exportDocument(): Uint8Array {
    return Y.encodeStateAsUpdate(this.docModel.ydoc);
  }

  /**
   * 导入文档状态
   */
  importDocument(update: Uint8Array): void {
    Y.applyUpdate(this.docModel.ydoc, update);
  }

  /**
   * 获取文档统计信息
   */
  getDocumentStats() {
    return {
      blocksCount: this.docModel.getBlockCount(),
      documentSize: Y.encodeStateAsUpdate(this.docModel.ydoc).length,
      isConnected: this.isConnected,
      onlineUsers: this.getOnlineUsers().length,
      websocketEnabled: !!this.websocketProvider
    };
  }
}
