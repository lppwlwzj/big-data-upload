import React, { useState } from "react";
import { Upload, message, Button, Space } from "antd";
import { UploadOutlined, CloudUploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload/interface";
import { request } from "../utils/request";
import { promiseLimiter } from "../utils/promiseLimiter";

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

interface fileProps {
  hash: string;
  filename: string;
}

interface Response<T> {
  code: number;
  message: string;
  re: T;
}

interface VerifyRes {
  needUpload: boolean;
  hasUploadList: string[];
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const ImageUpload: React.FC<ImageUploadProps> = ({
  multiple = false,
  maxCount = 5,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<fileProps>();
  const [requestList, setRequestList] = useState<XMLHttpRequest[]>();

  // 单个大文件上传
  const handleSingleUpload = async (file: RcFile) => {
    // 第一步：生成全部的文件切片
    const allChunks = await generateChunks(file);
    // 第二步：生成整个文件的hash
    const fileHash = (await generateHash(allChunks)) as string;
    //处理文件切片hash
    const allUploadList = allChunks.map((item, index) => {
      return {
        index: index,
        hash: fileHash + "-" + index,
        chunk: item,
        size: item.size
      };
    });
    // 设置上传文信息
    setUploadFile({
      hash: fileHash,
      filename: file.name
    });
    // 第三步：校验文件是否已上传，如果已上传直接返回上传完成，如果未上传，返回未上传的切片
    const res = await verifyUpload(fileHash, file.name);
    // 第四步：上传剩余切片
    if (!res.re.needUpload) {
      alert("文件秒传！");
      return;
    }
    await uploadChunks(allUploadList, res.re.hasUploadList);

    // 第五步：合并切片
    await mergeChunks();

    // 第六步：返回上传完成
  };
  const uploadChunks = async (
    allUploadList: any[],
    hasUploadList: string[]
  ) => {
    //过滤出需要上传的切片
    const shoudldUploadList = allUploadList
      .filter((item) => !hasUploadList.includes(item.hash))
      .map(({ chunk, hash, index }) => {
        if (!uploadFile?.filename || !uploadFile?.hash) return null;
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("index", index);
        formData.append("hash", hash);
        formData.append("filename", uploadFile.filename);
        formData.append("fileHash", uploadFile.hash);
        return formData;
      })
      .filter(Boolean)
      .map(
        (formData) => () =>
          request("/api/uploadChunk", {
            method: "POST",
            // headers: {
            //   "Content-Type": "multipart/form-data"
            // },
            data: formData,
            requestList
          })
      );
    //控制请求数量
    await promiseLimiter(shoudldUploadList, 2);
  };

  const mergeChunks = async () => {
    const res = await request(`/api/mergeChunks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        size:CHUNK_SIZE,
        filename: uploadFile?.filename,
        fileHash: uploadFile?.hash
      },
      responseType: "json"
    });
  };
  const verifyUpload = async (fileHash: string, filename: string) => {
    const res = (await request(`/api/verifyFile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        filename,
        fileHash
      },
      responseType: "json" // 明确指定响应类型为 json
    })) as Response<VerifyRes>;
    return res;
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
    const chunks = [] as Blob[];
    for (let i = 0; i < file.size; i += CHUNK_SIZE) {
      const chunk = file.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk);
    }
    return chunks;
  };
  const handleUpload = async () => {
    // const formData = new FormData();
    fileList.forEach((file) => {
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
