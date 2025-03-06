import React from 'react';
import { Card, Space, Typography } from 'antd';
import ImageUpload from '../components/ImageUpload';

const { Title } = Typography;

interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

const UploadDemo: React.FC = () => {
  const handleSingleUploadSuccess = (files: UploadedFile[]) => {
    console.log('单文件上传成功：', files[0]);
  };

  const handleMultipleUploadSuccess = (files: UploadedFile[]) => {
    console.log('多文件上传成功：', files);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>图片上传示例</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="单文件上传">
          <ImageUpload onSuccess={handleSingleUploadSuccess} />
        </Card>
        <Card title="多文件上传">
          <ImageUpload multiple maxCount={5} onSuccess={handleMultipleUploadSuccess} />
        </Card>
      </Space>
    </div>
  );
};

export default UploadDemo; 