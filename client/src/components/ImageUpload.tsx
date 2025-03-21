import React, { useState } from "react";
import { Upload, message, Button, Space, Progress } from "antd";
import { UploadOutlined, CloudUploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload/interface";
import { request } from "../utils/request";
import { promiseLimiter, pauseUpload, resumeUpload } from "../utils/promiseLimiter";

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

interface Response<T> {
  code: number;
  message: string;
  re: T;
}

interface VerifyRes {
  needUpload: boolean;
  hasUploadList: string[];
}

interface ChunkResponse {
  code: number;
  message: string;
  re: null;
}

interface UploadChunkFile {
  index: number;
  hash: string;
  chunk: Blob;
  size: number;
}

interface FileInfo {
  fileHash: string;
  filename: string;
}
const requestList: XMLHttpRequest[] = [];
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const ImageUpload: React.FC<ImageUploadProps> = ({
  multiple = false,
  maxCount = 5,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [allUploadList, setAllUploadList] = useState<UploadChunkFile[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [currentChunkProgress, setCurrentChunkProgress] = useState(0);
  const [hashProgress, setHashProgress] = useState(0);

  // 单个大文件上传
  const handleSingleUpload = async (file: RcFile) => {
    setUploading(true);
    setTotalProgress(0);
    setCurrentChunkProgress(0);
    setHashProgress(0);
    
    try {
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
      setAllUploadList(allUploadList);
      setFileInfo({
        fileHash: fileHash,
        filename: file.name
      });

      // 第三步：校验文件是否已上传
      const res = await verifyUpload(fileHash, file.name);
      if (!res.re.needUpload) {
        message.success("文件秒传成功！");
        setTotalProgress(100);
        setUploading(false);
        return;
      }

      // 第四步：上传剩余切片
      const result = await uploadChunks(
        allUploadList,
        res.re.hasUploadList,
        fileHash,
        file.name
      );
      if (result && result.some((r) => r.data.code !== 1)) {
        message.error("上传失败");
        return;
      }

      // 第五步：合并切片
      await mergeChunks(fileHash, file.name);
      message.success("上传成功！");
      setTotalProgress(100);
    } catch (error) {
      message.error("上传失败：" + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const uploadChunks = async (
    allUploadList: any[],
    hasUploadList: string[],
    fileHash: string,
    filename: string
  ) => {
    //过滤出需要上传的切片
    const shouldUploadList = allUploadList
      .filter((item) => !hasUploadList.includes(item.hash))
      .map(({ chunk, hash, index }) => {
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("index", index);
        formData.append("hash", hash);
        formData.append("filename", filename);
        formData.append("fileHash", fileHash);
        return formData;
      })
      .map(
        (formData, index, array): (() => Promise<ChunkResponse>) =>
          () =>
            request<ChunkResponse>("/api/uploadChunk", {
              method: "POST",
              data: formData,
              requestList,
              onProgress: (progress: number) => {
                setCurrentChunkProgress(progress);
                // 计算总体进度
                const totalProgress = Math.floor(
                  ((index + progress / 100) / array.length) * 100
                );
                setTotalProgress(totalProgress);
              }
            })
      );

    return await promiseLimiter<ChunkResponse>(shouldUploadList, 5);
  };

  const mergeChunks = async (fileHash: string, filename: string) => {
    const maxRetries = 3;
    const timeout = 30000; // 30秒超时
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const res = await request(`/api/mergeChunks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          data: {
            size: CHUNK_SIZE,
            filename,
            fileHash
          },
          responseType: "json",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        console.error(`第 ${i + 1} 次合并尝试失败:`, error);
        if (i === maxRetries - 1) {
          throw new Error(`合并失败，已重试 ${maxRetries} 次`);
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
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
        if (hashPercentage) {
          setHashProgress(Math.floor(hashPercentage));
        }
        if (hash) {
          setHashProgress(100);
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

  const handlePause = () => {
    // 先暂停 promiseLimiter
    pauseUpload();
    // 然后中断当前正在进行的请求
    requestList.forEach((item) => {
      item.abort();
    });
    setCurrentChunkProgress(0);
  };
  const handleResume = async () => {
    if (!fileInfo) return;
    setUploading(true);
    try {
      const { fileHash, filename } = fileInfo;
      // 第三步：校验文件是否已上传，如果已上传直接返回上传完成，如果未上传，返回未上传的切片
      const res = await verifyUpload(fileHash, filename);
      // 第四步：上传剩余切片
      if (!res.re.needUpload) {
        message.success("文件秒传成功！");
        setTotalProgress(100);
        return;
      }
      const result = await uploadChunks(
        allUploadList,
        res.re.hasUploadList,
        fileHash,
        filename
      );
      if (result && result.some((r) => r.data.code !== 1)) {
        message.error("上传失败");
        return;
      }

      // 第五步：合并切片
      await mergeChunks(fileHash, filename);
      message.success("上传成功！");
      setTotalProgress(100);
    } catch (error) {
      message.error("恢复上传失败：" + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

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
      
      {hashProgress > 0 && hashProgress < 100 && (
        <div style={{ marginTop: 16 }}>
          <div>计算文件 Hash</div>
          <Progress percent={hashProgress} />
        </div>
      )}
      
      {uploading && (
        <div style={{ marginTop: 16 }}>
          <div>总体上传进度</div>
          <Progress percent={totalProgress} />
          <div style={{ marginTop: 8 }}>当前分片上传进度</div>
          <Progress percent={currentChunkProgress} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          marginTop: 16
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
          disabled={fileList.length === 0 || !uploading}
          style={{ marginLeft: 16 }}
        >
          暂停
        </Button>
        <Button
          type="primary"
          onClick={handleResume}
          disabled={fileList.length === 0 || uploading}
          style={{ marginLeft: 16 }}
        >
          恢复
        </Button>
      </div>
    </Space>
  );
};

export default ImageUpload;
