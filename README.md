# 全栈应用项目

这是一个使用现代技术栈构建的全栈应用项目。

## 技术栈

### 前端
- React 18
- TypeScript
- Ant Design
- Vite (构建工具)

### 后端
- Node.js
- Express
- TypeScript

## 项目结构

```
.
├── client/               # 前端项目目录
│   ├── src/             # 源代码
│   ├── public/          # 静态资源
│   └── package.json     # 前端依赖
├── server/              # 后端项目目录
│   ├── src/            # 源代码
│   └── package.json    # 后端依赖
└── README.md           # 项目说明文档
```

## 开发环境设置

1. 安装依赖
```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

2. 启动开发服务器
```bash
# 启动前端开发服务器
cd client
npm run dev

# 启动后端服务器
cd ../server
npm run dev
```

## 构建和部署

1. 构建前端
```bash
cd client
npm run build
```

2. 构建后端
```bash
cd server
npm run build
```

## 功能特性

- 现代化的前端开发体验
- TypeScript 保证代码质量
- 完整的开发和构建流程
- 优雅的 UI 设计（Ant Design）
- RESTful API 设计
- 开发环境热重载 