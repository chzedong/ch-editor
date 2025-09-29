// 简单的 YJS WebSocket 服务器
// 运行: node server.js

import { WebSocketServer } from 'ws';
import http from 'http';
import { setupWSConnection } from 'y-websocket/bin/utils';

const server = http.createServer();
const wss = new WebSocketServer({ server });

console.log('YJS WebSocket Server starting...');

wss.on('connection', (ws, req) => {
  console.log('New client connected from:', req.socket.remoteAddress);
  setupWSConnection(ws, req);
});

const port = process.env.PORT || 1234;
server.listen(port, () => {
  console.log(`YJS WebSocket Server running on port ${port}`);
  console.log(`WebSocket URL: ws://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server');
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
