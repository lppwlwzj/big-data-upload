const express = require("express");

const router = express.Router();
const uploadRoutes = require("./upload");
const uploadController = require("../controllers/upload");

// 示例API路由
router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});
router.post("/verifyFile", uploadController.verifyFile);
router.post("/uploadChunk", uploadController.uploadChunk);
router.post("/mergeChunks", uploadController.mergeChunks);

// 文件上传路由
router.use("/upload", uploadRoutes);

module.exports = router;
