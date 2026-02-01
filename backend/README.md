# 后端代码

## 文件结构

```
backend/
├── websocket-server.js    # WebSocket 服务器
├── maze-generator.js      # 迷宫生成器
└── package.json          # 依赖配置
```

## 安装依赖

```bash
cd backend
npm install
```

## 运行服务器

```bash
npm start
# 或
node websocket-server.js
```

服务器将运行在：
- WebSocket: `ws://localhost:8080`
- HTTP API: `http://localhost:8081`

## 功能

- WebSocket 连接管理
- 房间管理（创建、加入、离开）
- 玩家同步
- 统一地图生成
- 静态文件服务（头像图片）

## 配置

默认端口：
- WebSocket: 8080
- HTTP: 8081

可以在代码中修改端口号。
