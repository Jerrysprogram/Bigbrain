import React, { useState, useEffect } from 'react';
import { List, Card, Avatar, Modal, Button, Dropdown, Menu, message, Input } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import { ifLogin } from '../../utills/index';
import requests from '../../utills/requests';

const gameData = [
  {
    id: 1,
    title: 'Game1',
    description: 'Test your math skills',
    cover: 'https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png',
    avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=1',
  },
  {
    id: 2,
    title: 'Game2',
    description: 'Test your math skills',
    cover: 'https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png',
    avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=1',
  },
];

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [gameName, setGameName] = useState('');
  const navigate = useNavigate();

  // 显示创建游戏弹窗
  const showCreateGameModal = () => setModalVisible(true);

  // 创建游戏
  const handleCreateGame = () => {
    // TODO: 替换为真实接口: requests.post('/admin/games', { name: gameName })
    message.success(`Game "${gameName}" created successfully`);
    setModalVisible(false);
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
    }
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Game List</h1>

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
        dataSource={gameData}
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
    </div>
  );
}
