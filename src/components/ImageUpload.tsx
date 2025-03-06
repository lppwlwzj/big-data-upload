import React, { useState } from 'react';
import { Upload, message, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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

  const uploadProps: UploadProps = {
    name: multiple ? 'files' : 'file',
    action: `/api/upload/${multiple ? 'multiple' : 'single'}`,
    multiple,
    maxCount,
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过 5MB！');
        return false;
      }
      return true;
    },
    onChange: (info) => {
      setFileList(info.fileList);
      
      if (info.file.status === 'uploading') {
        setUploading(true);
        return;
      }
      
      if (info.file.status === 'done') {
        setUploading(false);
        message.success(`${info.file.name} 上传成功！`);
        if (onSuccess) {
          const successFiles = info.fileList
            .filter(file => file.status === 'done')
            .map(file => file.response.data);
          onSuccess(multiple ? successFiles : [successFiles]);
        }
      } else if (info.file.status === 'error') {
        setUploading(false);
        message.error(`${info.file.name} 上传失败！`);
      }
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
  };

  return (
    <Upload {...uploadProps}>
      <Button icon={<UploadOutlined />} loading={uploading}>
        {multiple ? '上传多张图片' : '上传图片'}
      </Button>
    </Upload>
  );
};

export default ImageUpload; 