import React, { useState } from 'react';
import { Upload, message, Button, Space } from 'antd';
import { UploadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

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

const ImageUpload: React.FC<ImageUploadProps> = ({
  multiple = false,
  maxCount = 5,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const formData = new FormData();
    fileList.forEach((file) => {
      if (file.originFileObj) {
        if (multiple) {
          formData.append('files', file.originFileObj);
        } else {
          formData.append('file', file.originFileObj);
        }
      }
    });

    setUploading(true);

    try {
      const response = await fetch(`/api/upload/${multiple ? 'multiple' : 'single'}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        message.success('上传成功！');
        setFileList([]);
        if (onSuccess) {
          onSuccess(multiple ? result.data : [result.data]);
        }
      } else {
        message.error(result.message || '上传失败！');
      }
    } catch {
      message.error('上传失败！');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: multiple ? 'files' : 'file',
    multiple,
    maxCount,
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return Upload.LIST_IGNORE;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过 5MB！');
        return Upload.LIST_IGNORE;
      }
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
    },
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...uploadProps} customRequest={() => {}}>
        <Button icon={<UploadOutlined />}>
          {multiple ? '选择多张图片' : '选择图片'}
        </Button>
      </Upload>
      <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileList.length === 0}
        loading={uploading}
        icon={<CloudUploadOutlined />}
        style={{ marginTop: 16 }}
      >
        {uploading ? '上传中...' : '开始上传'}
      </Button>
    </Space>
  );
};

export default ImageUpload;