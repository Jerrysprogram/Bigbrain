import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Divider,
  List,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Popconfirm,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import requests from '../../utills/requests';

export default function GameEdit() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [infoVisible, setInfoVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [formInfo] = Form.useForm();
  const [formAdd] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  // 拉取当前游戏及题目
  const fetchGame = async () => {
    try {
      const { games } = await requests.get('/admin/games');
      const g = games.find(g => g.id === +gameId);
      if (!g) throw new Error('Game not found');
      setGame(g);
      setQuestions(g.questions || []);
    } catch (err) {
      message.error(`Failed to load game: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  // 编辑游戏信息
  const openInfo = () => {
    formInfo.setFieldsValue({
      name: game.name,
      description: game.description,
    });
    setFileList(game.thumbnail ? [{ uid: '-1', url: game.thumbnail, thumbUrl: game.thumbnail }] : []);
    setInfoVisible(true);
  };

  const handleInfoOk = async () => {
    try {
      const vals = await formInfo.validateFields();
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g =>
        g.id === +gameId ? {
          ...g,
          name: vals.name,
          description: vals.description,
          thumbnail: fileList.length ? (fileList[0].thumbUrl || fileList[0].url) : g.thumbnail,
        } : g
      );
      await requests.put('/admin/games', { games: updatedAll });
      message.success('Game information updated successfully');
      setInfoVisible(false);
      fetchGame();
    } catch (err) {
      message.error(`Update failed: ${err.message}`);
    }
  };

  const handleInfoCancel = () => {
    setInfoVisible(false);
    setFileList([]);
  };

  // 删除题目
  const handleDelete = async qid => {
    const newQs = questions.filter(q => q.id !== qid);
    try {
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g => (g.id === +gameId ? { ...g, questions: newQs } : g));
      await requests.put('/admin/games', { games: updatedAll });
      message.success('Question deleted successfully');
      setQuestions(newQs);
    } catch (err) {
      message.error(`Delete failed: ${err.message}`);
    }
  };

  // 添加题目
  const openAdd = () => {
    formAdd.resetFields();
    setAddVisible(true);
  };

  const handleAddOk = async () => {
    try {
      const vals = await formAdd.validateFields();
      const newQ = {
        id: Date.now(),
        text: vals.text,
        type: vals.type,
        duration: 30,
        points: 10,
        correctAnswers: [],
      };
      const newQs = [...questions, newQ];
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g => (g.id === +gameId ? { ...g, questions: newQs } : g));
      await requests.put('/admin/games', { games: updatedAll });
      message.success('Question added successfully');
      setAddVisible(false);
      setQuestions(newQs);
    } catch (err) {
      message.error(`Add failed: ${err.message}`);
    }
  };

  const handleAddCancel = () => {
    setAddVisible(false);
  };

  if (!game) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={() => navigate('/dashboard')}>← Back to Dashboard</Button>
        <h1>{game.name}</h1>
        <div>
          <Button onClick={openInfo} style={{ marginRight: 12 }}>
            Edit Game Info
          </Button>
          <Button type="primary" onClick={openAdd}>
            + Add Question
          </Button>
        </div>
      </div>
      <Divider>Question List</Divider>

      <List
        dataSource={questions}
        renderItem={(q, idx) => (
          <Card key={q.id} style={{ marginBottom: 12 }}>
            <Card.Meta
              title={`Question ${idx + 1}: ${q.text || 'No question text'}`}
              description={`Type: ${q.type || 'Unknown'}`}
            />
            <div style={{ float: 'right', marginTop: 8 }}>
              <Link to={`/game/${gameId}/question/${q.id}`}> 
                <EditOutlined style={{ marginRight: 12, cursor: 'pointer' }} />
              </Link>
              <Popconfirm title="Are you sure to delete this question?" onConfirm={() => handleDelete(q.id)}>
                <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} />
              </Popconfirm>
            </div>
          </Card>
        )}
      />

      <Modal title="Edit Game Info" visible={infoVisible} onOk={handleInfoOk} onCancel={handleInfoCancel}>
        <Form form={formInfo} layout="vertical">
          <Form.Item label="Game Cover">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={file => {
                const isImg = file.type.startsWith('image/');
                if (!isImg) message.error('Please upload image files only');
                return false;
              }}
            >
              {fileList.length < 1 && <div><PlusOutlined /><div>Upload</div></div>}
            </Upload>
          </Form.Item>
          <Form.Item name="name" label="Game Name" rules={[{ required: true, message: 'Please enter name' }]}>
            <Input placeholder="Enter game name" />
          </Form.Item>
          <Form.Item name="description" label="Game Description">
            <Input.TextArea placeholder="Enter game description" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Add New Question" visible={addVisible} onOk={handleAddOk} onCancel={handleAddCancel}>
        <Form form={formAdd} layout="vertical">
          <Form.Item name="text" label="Question Text" rules={[{ required: true, message: 'Please enter question text' }]}>
            <Input.TextArea placeholder="Enter question text" />
          </Form.Item>
          <Form.Item name="type" label="Question Type" rules={[{ required: true, message: 'Please select question type' }]}>
            <Select placeholder="Select question type">
              <Select.Option value="single">Single Choice</Select.Option>
              <Select.Option value="multiple">Multiple Choice</Select.Option>
              <Select.Option value="judgement">Judgement</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
