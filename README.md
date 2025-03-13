# 大文件分片上传项目

这是一个基于 React + TypeScript 实现的大文件分片上传项目，支持文件秒传、断点续传、暂停/恢复、支持控制异步请求数量等功能。

## 功能特点

- ✨ 大文件分片上传
- 🚀 文件秒传（通过文件 hash 判断）
- ⏸️ 上传暂停/恢复
- 🔄 断点续传
- 🎯 并发控制
- 📊 上传进度显示
- 🛡️ TypeScript 支持

## 技术栈

- React 18
- TypeScript
- Ant Design
- Web Worker (用于文件 hash 计算)

## 核心功能实现

### 1. 文件分片上传流程

1. 选择文件后，使用 `File.slice()` 方法将文件切分为固定大小的切片（默认 5MB）
2. 使用 Web Worker 计算整个文件的 hash 值（用于文件秒传）
3. 验证文件是否已上传（秒传）
4. 上传所有分片（支持并发控制）
5. 所有分片上传完成后，请求服务端合并分片

### 2. 断点续传实现

- 每个分片都有唯一的 hash 标识（文件hash + 分片索引）
- 上传前先验证已上传的分片列表
- 只上传未上传的分片

### 3. 暂停/恢复功能

- 支持暂停正在进行的上传任务
- 暂停时会中断当前正在上传的请求
- 恢复时会重新验证已上传分片，继续上传未完成的分片

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

## 使用方法

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 在组件中使用：
```typescript
import ImageUpload from './components/ImageUpload';

// 单文件上传
<ImageUpload onSuccess={handleSuccess} />

// 多文件上传
<ImageUpload multiple maxCount={5} onSuccess={handleSuccess} />
```

## 注意事项

1. 确保服务端支持对应的文件上传接口
2. 文件 hash 计算在 Web Worker 中进行，避免阻塞主线程
3. 默认分片大小为 5MB，可以根据需要调整
4. 上传并发数默认为 5，可以通过 promiseLimiter 参数调整

## 后续优化方向

1. 添加上传进度显示
2. 支持文件夹上传
3. 优化文件 hash 计算性能
4. 添加上传失败重试机制
5. 支持自定义分片大小
6. 添加文件类型和大小限制
