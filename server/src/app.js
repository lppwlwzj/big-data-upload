const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const config = require('./config');
// const bodyParser = require("body-parser");

const app = express();

// 中间件配置
app.use(cors(config.corsOptions));

// body解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api', routes);

// 跨域请求处理
// app.all("*", (req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "X-Requested-With");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "`Content`-Type, Content-Length, Authorization, Accept, X-Requested-With, X_Requested_With"
//   );
//   res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");

//   // OPTIONS类型的请求 复杂请求的预请求
//   if (req.method == "OPTIONS") {
//     res.send(200);
//   } else {
//     /*让options请求快速返回*/
//     next();
//   }
// });

// 基础路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    env: config.env 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error',
    message: 'Something went wrong!' 
  });
});

module.exports = app;