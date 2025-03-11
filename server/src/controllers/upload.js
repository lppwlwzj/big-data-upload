const fs = require("fs-extra");
const path = require("path");

const multiparty = require("multiparty");

const extractExt = (filename) =>
  filename.slice(filename.lastIndexOf("."), filename.length); // 提取后缀名

const UPLOAD_DIR = path.resolve(__dirname, "..", "public", "upload");

// 确保上传目录存在
fs.ensureDirSync(UPLOAD_DIR);

//已经上传切片名
const createUploadedList = (fileHash) => {
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}`);
  return fs.existsSync(filePath) ? fs.readdir(filePath) : [];
};

class UploadController {
  async verifyFile(req, res) {
    const { fileHash, filename } = req.body;

    const ext = extractExt(filename);
    const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);

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
        // await fs.writeFile(path.resolve(chunkDir, hash), chunk.buffer);
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
}

module.exports = new UploadController();
