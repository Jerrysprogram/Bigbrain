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

  // 定义一个函数：从后端获取游戏列表
  const fetchGames = () => {
    requests.get('/admin/games')
      .then(response => setGames(response.games))
      .catch(err => message.error(`Failed to load games: ${err.message}`));
  };

  // 登录验证并初次加载游戏列表
  useEffect(() => {
    if (!ifLogin()) {
      message.warning('No active session detected. Redirecting to login page.', 0.5, () => navigate('/login'));
    } else {
      fetchGames();
    }
  }, []);

  /**
   * 创建新游戏：更新整个游戏列表
   * @param {*} _
   */
  const handleCreateGame = async () => {
    try {
      const values = await form.validateFields();
      // 构建新游戏对象，不需要手动生成id
      const newGame = {
        // 生成唯一ID，因为PUT接口需要id
        id: Date.now(),
        name: values.name,
        description: values.description || '',
        // 如果用户上传了缩略图，取 base64 data
        thumbnail: fileList.length ? (fileList[0].thumbUrl || fileList[0].url) : undefined,
        owner: localStorage.getItem('email'),
        updatedAt: new Date().toISOString(),
      };
      // 更新后端的游戏列表
      const data = { games: [...games, newGame] };
      await requests.put('/admin/games', data);
      message.success(`Game "${newGame.name}" created successfully`);
      // 重新加载列表、重置表单
      fetchGames();
      form.resetFields();
      setFileList([]);
      setModalVisible(false);
    } catch (err) {
      message.error(`Failed to create game: ${err.message}`);
    }
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Game List</h1>

      {/* 创建游戏按钮 */}
      <Button type="primary" onClick={showCreateGameModal} style={{ marginBottom: 16 }}>
        Create Game
      </Button>

      {/* 创建游戏弹窗 */}
      <Modal
        title="Create New Game"
        okText="Create"
        cancelText="Cancel"
        visible={modalVisible}
        onOk={handleCreateGame}
        onCancel={() => { setModalVisible(false); form.resetFields(); setFileList([]); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Thumbnail (optional)">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={file => { const isImg = file.type.startsWith('image/'); if (!isImg) message.error('Please upload image files only'); return false; }}
              style={{ width: '100%' }}
            >
              {fileList.length < 1 && <div><PlusOutlined /><div>Upload</div></div>}
            </Upload>
          </Form.Item>
          <Form.Item
            name="name"
            label="Game Name"
            rules={[{ required: true, message: 'Please enter game name' }]}
          >
            <Input placeholder="Enter game name" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Game Description (optional)"
          >
            <Input.TextArea placeholder="Enter game description" allowClear />
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
          <p>No games available. Click "Create Game" to create a new game.</p>
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
                    alt={item.name}
                    src={item.thumbnail}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                }
              >
                <Card.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={<Link to={`/games/${item.id}`}>{item.name}</Link>}
                  description={item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No description available'}
                />
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
