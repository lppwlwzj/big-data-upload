import React, { useState } from "react";
import { Upload, message, Button, Space } from "antd";
import { UploadOutlined, CloudUploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload/interface";

interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

interface ImageUploadProps {
  multiple?: boolean;
  maxCount?: number;
  onSuccess?: (files: UploadedFile[]) => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const ImageUpload: React.FC<ImageUploadProps> = ({
  multiple = false,
  maxCount = 5,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileHash, setFileHash] = useState<unknown>();

  // 单个大文件上传
  const handleSingleUpload = async (file: RcFile) => {
    // 第一步：生成全部的文件切片
    const allChunks = await generateChunks(file);
    // 第二步：生成整个文件的hash
    const fileHash = await generateHash(allChunks);
    console.log(fileHash);
    setFileHash(fileHash);
    // 第三步：校验文件是否已上传，如果已上传直接返回上传完成，如果未上传，返回未上传的切片
    // 第四步：上传剩余切片
    // 第五步：合并切片
    // 第六步：返回上传完成
  };

  //生成整个文件的hash 以及各个分片的hash ：结合文件内容生成md5，耗时，放在web-worker中
  const generateHash = (chunkList: Blob[]) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker("/hash.js");
      worker.postMessage({ chunkList });
      worker.onmessage = (event) => {
        const { hash, hashPercentage } = event.data;
        if (hash) {
          resolve(hash);
        }
      };
    });
  };
  // 生成文件切片
  const generateChunks = async (file: RcFile) => {
    const chunks = [];
    for (let i = 0; i < file.size; i += CHUNK_SIZE) {
      const chunk = file.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk);
    }
    return chunks;
  };
  const handleUpload = async () => {
    // const formData = new FormData();
    fileList.forEach((file) => {
      console.log(file);

      if (file.originFileObj) {
        if (multiple) {
          // formData.append('files', file.originFileObj);
        } else {
          // formData.append('file', file.originFileObj);
          handleSingleUpload(file.originFileObj);
        }
      }
    });

    // setUploading(true);

    // try {
    //   const response = await fetch(`/api/upload/${multiple ? 'multiple' : 'single'}`, {
    //     method: 'POST',
    //     body: formData,
    //   });

    //   const result = await response.json();

    //   if (response.ok) {
    //     message.success('上传成功！');
    //     setFileList([]);
    //     if (onSuccess) {
    //       onSuccess(multiple ? result.data : [result.data]);
    //     }
    //   } else {
    //     message.error(result.message || '上传失败！');
    //   }
    // } catch {
    //   message.error('上传失败！');
    // } finally {
    //   setUploading(false);
    // }
  };

  const handlePause = () => {};
  const handleResume = () => {};

  const uploadProps: UploadProps = {
    name: multiple ? "files" : "file",
    multiple,
    maxCount,
    fileList,
    beforeUpload: (file) => {
      //   const isImage = file.type.startsWith('image/');
      //   if (!isImage) {
      //     message.error('只能上传图片文件！');
      //     return Upload.LIST_IGNORE;
      //   }
      //   const isLt5M = file.size / 1024 / 1024 < 5;
      //   if (!isLt5M) {
      //     message.error('图片大小不能超过 5MB！');
      //     return Upload.LIST_IGNORE;
      //   }
      return false; // 阻止自动上传
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Upload {...uploadProps} customRequest={() => {}}>
        <Button icon={<UploadOutlined />}>
          {multiple ? "选择多张图片" : "选择图片"}
        </Button>
      </Upload>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start"
        }}
      >
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0}
          loading={uploading}
          icon={<CloudUploadOutlined />}
        >
          {uploading ? "上传中..." : "开始上传"}
        </Button>
        <Button
          type="primary"
          onClick={handlePause}
          disabled={fileList.length === 0}
          style={{ marginLeft: 16 }}
        >
          暂停
        </Button>
        <Button
          type="primary"
          onClick={handleResume}
          disabled={fileList.length === 0}
          style={{ marginLeft: 16 }}
        >
          恢复
        </Button>
      </div>
    </Space>
  );
};

export default ImageUpload;
