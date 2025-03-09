const express = require('express');
const router = express.Router();
const uploadRoutes = require('./upload');

// 示例API路由
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// 文件上传路由
router.use('/upload', uploadRoutes);

module.exports = router;