import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import UploadDemo from './pages/UploadDemo';

const { Header, Content } = Layout;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh',minWidth: '100vw' }}>
        <Header>
          <Menu theme="dark" mode="horizontal">
            <Menu.Item key="upload">
              <Link to="/upload">图片上传</Link>
            </Menu.Item>
          </Menu>
        </Header>
        <Content>
          <Routes>
            <Route path="/upload" element={<UploadDemo />} />
            <Route path="/" element={<UploadDemo />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
};

export default App;
