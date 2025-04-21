import React, { useState, useEffect } from 'react';
import { List, Card, Avatar, Modal, Button, Dropdown, Menu, message, Upload, Form, Input } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import { ifLogin } from '../../utills/index';
import requests from '../../utills/requests';
import { PlusOutlined } from '@ant-design/icons';

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [games, setGames] = useState([]);
  const navigate = useNavigate();

  // 显示创建游戏弹窗
  const showCreateGameModal = () => setModalVisible(true);

  // 创建游戏
  const handleCreateGame = () => {
    form.validateFields().then(values => {
      // 收集表单数据
      const payload = { name: values.name, description: values.description || '' };
      if (fileList.length > 0) {
        // 使用base64 thumbnail
        payload.thumbnail = fileList[0].thumbUrl || fileList[0].url;
      }
      // 调用后端创建接口
      requests.post('/admin/games', payload)
        .then(res => {
          // 更新列表
          setGames(prev => [...prev, res.game]);
          message.success(`Game "${payload.name}" created successfully`);
          form.resetFields(); setFileList([]);
          setModalVisible(false);
        })
        .catch(err => message.error(`Failed to create game: ${err.message}`));
    });
  };

  // 取消创建游戏
  const handleCancel = () => setModalVisible(false);

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    message.success('Logged out successfully');
    navigate('/login');
  };

  // 顶部右侧下拉菜单
  const menu = (
    <Menu>
      <Menu.Item onClick={handleLogout}>Logout</Menu.Item>
    </Menu>
  );

  // 登录验证：无token则跳转登录
  useEffect(() => {
    if (!ifLogin()) {
      message.warning('No active session detected. Redirecting to login page.', 0.5, () => navigate('/login'));
    } else {
      // 已登录则加载游戏列表
      requests.get('/admin/games')
        .then(response => {
          setGames(response.games);
        })
        .catch(err => {
          message.error(`Failed to load games: ${err.message}`);
        });
    }
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Game List</h1>

      {/* 创建游戏按钮 */}
      <Button type="primary" onClick={showCreateGameModal} style={{ marginBottom: 16 }}>
        Create Game
      </Button>

      {/* 创建游戏弹窗 */}
      <Modal
        title="创建新游戏"
        visible={modalVisible}
        okText="创建"
        cancelText="取消"
        onOk={handleCreateGame}
        onCancel={() => { setModalVisible(false); form.resetFields(); setFileList([]);} }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="缩略图 (可选)">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={file => { const isImg = file.type.startsWith('image/'); if (!isImg) message.error('请上传图片文件'); return false; }}
            >
              {fileList.length < 1 && <div><PlusOutlined /><div>上传</div></div>}
            </Upload>
          </Form.Item>
          <Form.Item
            name="name"
            label="游戏名称"
            rules={[{ required: true, message: '请输入游戏名称' }]}
          >
            <Input placeholder="请输入游戏名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="游戏描述 (可选)"
          >
            <Input.TextArea placeholder="请输入游戏描述" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      {/* 右上角头像 + 下拉菜单 */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <Dropdown overlay={menu} trigger={['click']}>
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </div>

      {/* 动态渲染游戏列表或无游戏提示 */}
      {games.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p>暂时没有游戏，点击"Create Game"创建游戏</p>
        </div>
      ) : (
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 1,
            md: 1,
            lg: 1,
            xl: 1,
            xxl: 1,
          }}
          dataSource={games}
          renderItem={(item) => (
            <List.Item>
              <Card
                hoverable
                style={{ width: '300px', margin: '0 auto' }}
                cover={
                  <img
                    alt={item.title}
                    src={item.cover}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                }
              >
                <Card.Meta
                  avatar={<Avatar src={item.avatar} />}
                  title={<Link to={`/games/${item.id}`}>{item.title}</Link>}
                  description={item.description}
                />
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
