const fs = require("fs-extra");
const path = require("path");

const multiparty = require("multiparty");
// 提取后缀名
const extractExt = (filename) =>
  filename.slice(filename.lastIndexOf("."), filename.length);

const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");
const TARGET_DIR = path.resolve(__dirname, "..", "target");

// 确保上传目录存在
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(TARGET_DIR);

//已经上传切片名
const createUploadedList = async (fileHash) => {
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}`);
  return await fs.exists(filePath) ? await fs.readdir(filePath) : [];
};

// 修改文件流处理函数
const pipeStream = (path, writeStream) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(path);
    
    readStream.on("error", (error) => {
      readStream.destroy();
      reject(error);
    });

    writeStream.on("error", (error) => {
      readStream.destroy();
      reject(error);
    });

    readStream.on("end", () => {
      try {
        fs.unlinkSync(path);
        resolve(true);
      } catch (error) {
        console.warn("删除切片文件失败:", error);
        resolve(true);
      }
    });
    // 使用 { end: false } 选项，防止过早关闭写入流
    readStream.pipe(writeStream, { end: false });
  });
};

class UploadController {
  async verifyFile(req, res) {
    const { fileHash, filename } = req.body;

    const ext = extractExt(filename);
    const filePath = path.resolve(TARGET_DIR, `${fileHash}${ext}`);

    if (fs.existsSync(filePath)) {
      res.send({
        code: 1,
        message: "文件已存在",
        re: {
          needUpload: false
        }
      });
    } else {
      res.send({
        code: 0,
        message: "文件不存在",
        re: {
          needUpload: true,
          hasUploadList: await createUploadedList(fileHash)
        }
      });
    }
  }

  async uploadChunk(req, res) {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("上传切片失败", err);
        res.send({
          code: 500,
          message: "上传失败",
          re: null
        });
        return;
      }
      const [chunk] = files.chunk;
      const [hash] = fields.hash;
      const [filename] = fields.filename;
      const [index] = fields.index;
      const [fileHash] = fields.fileHash;
      const filePath = path.resolve(
        UPLOAD_DIR,
        `${fileHash}${extractExt(filename)}`
      );

      const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}`);

      try {
        // 确保切片目录存在
        await fs.ensureDir(chunkDir);

        // 切片存在，直接返回
        if (fs.existsSync(filePath)) {
          res.send({
            code: 1,
            message: "上传成功",
            re: null
          });
          return;
        }

        // 保存切片
        const chunkPath = path.resolve(chunkDir, hash);
        fs.copyFileSync(chunk.path, chunkPath); // 将临时文件复制到最终位置
        //或者使用：
        // await fs.move(chunk.path, path.resolve(chunkDir, hash));
        res.send({
          code: 1,
          message: "保存切片成功",
          re: null
        });
      } catch (err) {
        res.send({
          code: 500,
          message: "保存切片失败",
          re: err
        });
      }
    });
  }
  //法一
  // async mergeChunks(req, res) {
  //   const { filename, fileHash, size } = req.body;
  //   const ext = extractExt(filename);
  //   const filePath = path.resolve(TARGET_DIR, `${fileHash}${ext}`);
  //   const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}`);

  //   try {
  //     // 确保目标目录存在
  //     await fs.ensureDir(TARGET_DIR);

  //     const chunkPaths = await fs.readdir(chunkDir);
  //     // 按照切片索引排序
  //     chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);

  //     // 创建写入流
  //     const writeStream = fs.createWriteStream(filePath);

  //     // 依次写入切片
  //     for (let chunkPath of chunkPaths) {
  //       await pipeStream(path.resolve(chunkDir, chunkPath), writeStream);
  //     }

  //     // 关闭写入流
  //     writeStream.close();

  //     // 删除切片目录
  //     await fs.remove(chunkDir);

  //     res.send({
  //       code: 1,
  //       message: "合并成功",
  //       re: null
  //     });
  //   } catch (error) {
  //     console.error("合并文件失败:", error);
  //     res.status(500).send({
  //       code: 0,
  //       message: "合并失败",
  //       re: error.message
  //     });
  //   }
  // }
  async mergeChunks(req, res) {
    const { filename, fileHash, size } = req.body;
    const ext = extractExt(filename);
    const filePath = path.resolve(TARGET_DIR, `${fileHash}${ext}`);
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}`);

    let writeStream = null;

    try {
      // 确保目标目录存在
      await fs.ensureDir(TARGET_DIR);

      // 确保切片目录存在
      if (!await fs.exists(chunkDir)) {
        throw new Error("切片目录不存在");
      }

      const chunkPaths = await fs.readdir(chunkDir);
      // 按照切片索引排序
      chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);

      // 创建写入流
      writeStream = fs.createWriteStream(filePath);

      // 使用 for...of 循环串行处理每个切片
      for (const chunkPath of chunkPaths) {
        try {
          await pipeStream(path.resolve(chunkDir, chunkPath), writeStream);
        } catch (error) {
          console.error(`处理切片 ${chunkPath} 失败:`, error);
          throw error;
        }
      }

      // 完成写入
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
        writeStream.end();
      });

      // 删除切片目录
      try {
        await fs.remove(chunkDir);
      } catch (error) {
        console.warn("删除切片目录失败:", error);
      }

      res.send({
        code: 1,
        message: "合并成功",
        re: null
      });
    } catch (error) {
      console.error("合并文件失败:", error);
      
      // 清理资源
      if (writeStream) {
        writeStream.destroy();
      }
      
      // 如果合并失败，尝试删除已经创建的文件
      try {
        await fs.remove(filePath);
      } catch (cleanupError) {
        console.error("清理合并失败的文件失败:", cleanupError);
      }

      res.status(500).send({
        code: 0,
        message: "合并失败: " + error.message,
        re: null
      });
    }
  }
}

module.exports = new UploadController();
