import React, { useState, useEffect } from 'react';
import { List, Card, Avatar, Modal, Button, Dropdown, Menu, message, Upload, Form, Input, Popconfirm, Divider } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ifLogin } from '../../utills/index';
import requests from '../../utills/requests';

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(null);
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);

  /**
   * 打开创建/编辑弹窗
   */
  const showCreateGameModal = (game = null) => {
    setEditingGame(game);
    if (game) {
      form.setFieldsValue({ name: game.name, description: game.description });
      setFileList(game.thumbnail ? [{ uid: '-1', url: game.thumbnail, thumbUrl: game.thumbnail }] : []);
    } else {
      form.resetFields();
      setFileList([]);
    }
    setModalVisible(true);
  };

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

  useEffect(() => {
    // 从后端拉当前游戏
    requests.get('/admin/games').then(({ games }) => {
      const g = games.find(g => g.id === +gameId);
      setGame(g);
      setQuestions(g.questions || []);
    });
  }, [gameId]);

  /**
   * 弹窗确认：创建或更新游戏
   */
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // 构造游戏对象，新游戏需提供唯一id
      const base = editingGame || {};
      const updated = {
        id: base.id || Date.now(),
        name: values.name,
        description: values.description || '',
        thumbnail: fileList.length ? (fileList[0].thumbUrl || fileList[0].url) : base.thumbnail,
        owner: base.owner || localStorage.getItem('email'),
        updatedAt: new Date().toISOString(),
      };
      // 更新列表并PUT
      const newList = editingGame
        ? games.map(g => (g.id === editingGame.id ? updated : g))
        : [...games, updated];
      await requests.put('/admin/games', { games: newList });
      message.success(editingGame ? 'Game updated successfully' : 'Game created successfully');
      // 刷新并重置状态
      fetchGames();
      form.resetFields();
      setFileList([]);
      setEditingGame(null);
      setModalVisible(false);
    } catch (err) {
      message.error(`Failed to create game: ${err.message}`);
    }
  };

  /**
   * 取消创建/编辑：关闭弹窗并重置状态
   */
  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setFileList([]);
    setEditingGame(null);
  };

  /**
   * 删除游戏：过滤并PUT更新列表
   */
  const handleDeleteGame = async (id) => {
    const newList = games.filter(g => g.id !== id);
    try {
      await requests.put('/admin/games', { games: newList });
      message.success('Game deleted successfully');
      fetchGames();
    } catch (err) {
      message.error(`Failed to delete game: ${err.message}`);
    }
  };

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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Button onClick={() => navigate('/dashboard')}>← Back Dashboard</Button>
        <h1>{game?.name || '加载中…'}</h1>
        <div>
          <Button onClick={() => showCreateGameModal(game)}>编辑游戏信息</Button>
          <Button type="primary" onClick={() => showCreateGameModal(null)}>+ 添加问题</Button>
        </div>
      </div>
      <Divider>问题列表</Divider>

      {/* 创建游戏按钮 */}
      <Button type="primary" onClick={() => showCreateGameModal(null)} style={{ marginBottom: 16 }}>
        Create Game
      </Button>

      {/* 创建游戏弹窗 */}
      <Modal
        title="Create New Game"
        okText="Create"
        cancelText="Cancel"
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={handleCancel}
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
                {/* 编辑/删除操作 */}
                <div style={{ textAlign: 'right', paddingTop: 8 }}>
                  <Link to={`/game/${item.id}`}>
                    <EditOutlined style={{ cursor: 'pointer' }} />
                  </Link>
                  <Popconfirm
                    title="Are you sure to delete this game?"
                    onConfirm={() => handleDeleteGame(item.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <DeleteOutlined style={{ color: 'red' }} />
                  </Popconfirm>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

export async function getGameById(id) {
  const { games } = await requests.get('/admin/games');
  return games.find(g => g.id === +id);
}
