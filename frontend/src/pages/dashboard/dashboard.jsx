import { useState, useEffect } from 'react';
import { List, Card, Avatar, Modal, Button, Dropdown, message, Upload, Form, Input, Popconfirm } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { ifLogin } from '../../utills/index';
import requests from '../../utills/requests';

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(null);
  const navigate = useNavigate();
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [newSessionId, setNewSessionId] = useState(null);

  /**
   * Open create/edit modal
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

  // Define a function: fetch game list from backend
  const fetchGames = () => {
    requests.get('/admin/games')
      .then(response => setGames(response.games))
      .catch(err => message.error(`Failed to load games: ${err.message}`));
  };

  // Verify login and load game list initially
  useEffect(() => {
    if (!ifLogin()) {
      message.warning('No active session detected. Redirecting to login page.', 0.5, () => navigate('/login'));
    } else {
      fetchGames();
    }
  }, []);

  /**
   * Modal confirmation: create or update game
   */
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // Construct game object; new games must have a unique id
      const base = editingGame || {};
      const updated = {
        id: base.id || Date.now(),
        name: values.name,
        description: values.description || '',
        thumbnail: fileList.length ? (fileList[0].thumbUrl || fileList[0].url) : base.thumbnail,
        owner: base.owner || localStorage.getItem('email'),
        updatedAt: new Date().toISOString(),
      };
      // Update list and send PUT request
      const newList = editingGame
        ? games.map(g => (g.id === editingGame.id ? updated : g))
        : [...games, updated];
      await requests.put('/admin/games', { games: newList });
      message.success(editingGame ? 'Game updated successfully' : 'Game created successfully');
      // Refresh list and reset state
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
   * Cancel create/edit: close modal and reset state
   */
  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setFileList([]);
    setEditingGame(null);
  };

  /**
   * Delete game: filter and update list via PUT
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

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    message.success('Logged out successfully');
    navigate('/login');
  };

  // Top right dropdown menu items configuration (Antd v5 usage)
  const userMenu = {
    items: [
      { key: 'logout', label: 'Logout', onClick: handleLogout },
    ],
  };

  // Start game session
  const handleStartSession = async (gameId) => {
    try {
      // Start session (do not automatically progress questions, stay in Lobby for players to join)
      const { data } = await requests.post(`/admin/game/${gameId}/mutate`, { mutationType: 'START' });
      const sessionId = data.sessionId;
      setNewSessionId(sessionId);
      setSessionModalVisible(true);
      fetchGames();
    } catch (err) {
      message.error(`Start session failed: ${err.message}`);
    }
  };

  // Stop game session (first confirm before calling)
  const handleStopSession = (gameId, sessionId) => {
    Modal.confirm({
      title: 'Stop Session?',
      content: 'Stopping the session will end the game and redirect to results. Continue?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          await requests.post(`/admin/game/${gameId}/mutate`, { mutationType: 'END' });
          message.success('Session stopped successfully');
          fetchGames();
          navigate(`/session/${sessionId}`);
        } catch (err) {
          message.error(`Stop session failed: ${err.message}`);
        }
      },
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Create game button */}
      <Button type="primary" onClick={() => showCreateGameModal(null)} style={{ marginBottom: 16 }}>
        Create Game
      </Button>

      {/* Top right avatar + dropdown menu */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <Dropdown menu={userMenu} trigger={['click']}>
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </div>

      {/* Dynamic render game list or no game prompt */}
      {(!Array.isArray(games) || games.length === 0) ? (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p>No games available. Click &quot;Create Game&quot; to create a new game.</p>
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
          dataSource={Array.isArray(games) ? games : []}
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
                {/* Edit/Delete operations */}
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
                    <DeleteOutlined style={{ color: 'red', marginLeft: 12 }} />
                  </Popconfirm>
                  {/* Start Session button */}
                  {item.active == null ? (
                    (Array.isArray(item.questions) && item.questions.length > 0) ? (
                      <Button type="primary" size="small" style={{ marginTop: 8 }} onClick={() => handleStartSession(item.id)}>
                        Start Session
                      </Button>
                    ) : (
                      <Button type="primary" size="small" style={{ marginTop: 8 }} disabled>
                        Add Questions First
                      </Button>
                    )
                  ) : (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                      <strong>Session ID:</strong>&nbsp;{item.active}
                      <Button type="link" size="small" onClick={() => navigate(`/session/${item.active}`)}>
                        Manage Game
                      </Button>
                      <Button type="default" size="small" style={{ marginLeft: 8 }} onClick={() => handleStopSession(item.id, item.active)}>
                        Stop Game
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* Create game modal */}
      <Modal
        title="Create New Game"
        okText="Create"
        cancelText="Cancel"
        open={modalVisible}
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

      {/* Session Modal */}
      <Modal
        title="Session Started"
        open={sessionModalVisible}
        onCancel={() => setSessionModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => {
            const url = `${window.location.origin}/play/join/${newSessionId}`;
            navigator.clipboard.writeText(url);
            message.success('Link copied');
          }}>
            Copy Link
          </Button>
        ]}
      >
        <div>
          <p><strong>Session ID:</strong> {newSessionId}</p>
          <Input value={`${window.location.origin}/play/join/${newSessionId}`} readOnly />
        </div>
      </Modal>
    </div>
  );
}