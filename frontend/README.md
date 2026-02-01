# 前端代码

## 文件结构

```
frontend/
├── index.html          # 主入口文件
├── js/                 # JavaScript 模块
│   ├── config/        # 配置模块
│   ├── core/          # 核心逻辑
│   ├── entities/      # 游戏实体
│   ├── multiplayer/    # 多人游戏
│   └── ui/            # UI 管理
├── styles/            # 样式文件
│   └── main.css
└── assets/            # 静态资源
    └── images/        # 角色头像
```

## 使用方式

### 开发环境
直接打开 `index.html` 或使用本地服务器：
```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

### 生产环境
可以部署到任何静态文件服务器（Nginx、Apache、CDN等）
