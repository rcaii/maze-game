# LIFE - 人生迷宫游戏

一个基于 Three.js 的 3D 迷宫游戏，支持单人和多人模式。

## 📁 项目结构

```
maze/
├── frontend/                    # 前端代码
│   ├── index.html              # 主入口文件
│   ├── js/                     # JavaScript 模块
│   │   ├── config/            # 配置模块
│   │   ├── core/              # 核心逻辑
│   │   ├── entities/          # 游戏实体
│   │   ├── multiplayer/       # 多人游戏
│   │   └── ui/                # UI 管理
│   ├── styles/                # 样式文件
│   └── assets/                 # 静态资源
│       └── images/             # 角色头像
│
├── backend/                    # 后端代码
│   ├── websocket-server.js    # WebSocket 服务器
│   ├── maze-generator.js      # 服务器端迷宫生成
│   ├── package.json           # 依赖配置
│   └── README.md              # 后端说明
│
└── docs/                       # 文档
    ├── ARCHITECTURE.md        # 架构文档
    └── README-多人游戏部署说明.md
```

## 🚀 快速开始

### 单人模式（仅前端）

1. 进入前端目录：
   ```bash
   cd frontend
   ```

2. 直接打开 `index.html` 或使用本地服务器：
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

3. 在浏览器中打开并点击"离线模式"开始游戏

### 多人模式（前端 + 后端）

#### 1. 启动后端服务器

```bash
cd backend
npm install    # 首次运行需要安装依赖
npm start      # 或 node websocket-server.js
```

服务器将运行在：
- WebSocket: `ws://localhost:8080`
- HTTP API: `http://localhost:8081`

#### 2. 启动前端

```bash
cd frontend
# 使用任何静态文件服务器，或直接打开 index.html
python -m http.server 8000
```

#### 3. 配置和游戏

1. 在浏览器中打开前端页面
2. 在"服务器配置"区域输入服务器地址（默认：`ws://localhost:8080`）
3. 选择角色，创建或加入房间
4. 等待至少2人加入后，点击"准备"开始游戏

## 📦 模块说明

### 前端模块

- **配置模块** (`js/config/`): 关卡配置、角色配置、游戏参数
- **核心模块** (`js/core/`): 游戏主循环、关卡管理、迷宫生成、相机控制
- **实体模块** (`js/entities/`): 玩家控制、NPC 和道具系统
- **多人游戏模块** (`js/multiplayer/`): WebSocket 通信、房间管理、玩家同步
- **UI 模块** (`js/ui/`): UI 更新、数据显示、特效显示

### 后端模块

- **WebSocket 服务器**: 处理玩家连接、房间管理、消息同步
- **迷宫生成器**: 服务器端统一生成地图，确保所有玩家看到相同的地图

## 🎮 游戏玩法

- **移动**: WASD 或方向键
- **跳跃**: 方向键 + 空格（每关最多 10 次）
- **目标**: 从起点到达终点
- **血量**: 全程 100 点，被 NPC 碰撞会扣血
- **道具**: 拾取血包恢复血量，拾取弹跳包恢复跳跃次数

## 🔧 开发说明

### 前端开发

所有模块使用命名空间对象：
- `Game` - 主游戏逻辑
- `Player` - 玩家控制
- `NPC` - NPC 和道具
- `Multiplayer` - 多人游戏
- `UI` - 用户界面
- `MazeGenerator` - 迷宫生成

### 后端开发

- 使用 Node.js + WebSocket (ws)
- 支持房间管理、玩家同步
- 提供 HTTP API 获取房间列表
- 提供静态文件服务（头像图片）

## 📝 部署说明

详细部署说明请查看：
- [多人游戏部署说明](./docs/README-多人游戏部署说明.md)
- [架构文档](./docs/ARCHITECTURE.md)

## 📄 许可证

本项目仅供学习和参考使用。
