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
  Popconfirm,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
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

  // 拉取当前游戏及题目
  const fetchGame = async () => {
    try {
      const { games } = await requests.get('/admin/games');
      const g = games.find(g => g.id === +gameId);
      if (!g) throw new Error('游戏未找到');
      setGame(g);
      setQuestions(g.questions || []);
    } catch (err) {
      message.error(`加载游戏失败: ${err.message}`);
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
    setInfoVisible(true);
  };
  const handleInfoOk = async () => {
    try {
      const vals = await formInfo.validateFields();
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g =>
        g.id === +gameId ? { ...g, name: vals.name, description: vals.description } : g
      );
      await requests.put('/admin/games', { games: updatedAll });
      message.success('游戏信息已更新');
      setInfoVisible(false);
      fetchGame();
    } catch (err) {
      message.error(`更新失败: ${err.message}`);
    }
  };
  const handleInfoCancel = () => {
    setInfoVisible(false);
  };

  // 删除题目
  const handleDelete = async qid => {
    const newQs = questions.filter(q => q.id !== qid);
    try {
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g => (g.id === +gameId ? { ...g, questions: newQs } : g));
      await requests.put('/admin/games', { games: updatedAll });
      message.success('题目已删除');
      setQuestions(newQs);
    } catch (err) {
      message.error(`删除失败: ${err.message}`);
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
      const newQ = { id: Date.now(), text: vals.text, type: vals.type };
      const newQs = [...questions, newQ];
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g => (g.id === +gameId ? { ...g, questions: newQs } : g));
      await requests.put('/admin/games', { games: updatedAll });
      message.success('题目已添加');
      setAddVisible(false);
      setQuestions(newQs);
    } catch (err) {
      message.error(`添加失败: ${err.message}`);
    }
  };
  const handleAddCancel = () => {
    setAddVisible(false);
  };

  if (!game) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={() => navigate('/dashboard')}>← Back Dashboard</Button>
        <h1>{game.name}</h1>
        <div>
          <Button onClick={openInfo} style={{ marginRight: 12 }}>
            编辑游戏信息
          </Button>
          <Button type="primary" onClick={openAdd}>
            + 添加问题
          </Button>
        </div>
      </div>
      <Divider>问题列表</Divider>

      <List
        dataSource={questions}
        renderItem={(q, idx) => (
          <Card key={q.id} style={{ marginBottom: 12 }}>
            <Card.Meta
              title={`问题 ${idx + 1}: ${q.text || '未填写题干'}`}
              description={`类型: ${q.type || '未知'}`}
            />
            <div style={{ float: 'right', marginTop: 8 }}>
              <Link to={`/game/${gameId}/question/${q.id}`}> 
                <EditOutlined style={{ marginRight: 12, cursor: 'pointer' }} />
              </Link>
              <Popconfirm title="确认删除该题？" onConfirm={() => handleDelete(q.id)}>
                <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} />
              </Popconfirm>
            </div>
          </Card>
        )}
      />

      <Modal title="编辑游戏信息" visible={infoVisible} onOk={handleInfoOk} onCancel={handleInfoCancel}>
        <Form form={formInfo} layout="vertical">
          <Form.Item name="name" label="游戏名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="游戏描述">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加新问题" visible={addVisible} onOk={handleAddOk} onCancel={handleAddCancel}>
        <Form form={formAdd} layout="vertical">
          <Form.Item name="text" label="题干" rules={[{ required: true, message: '请输入题干' }]}>
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="type" label="题型" rules={[{ required: true, message: '请选择题型' }]}>
            <Select>
              <Select.Option value="single">单选</Select.Option>
              <Select.Option value="multiple">多选</Select.Option>
              <Select.Option value="judgement">判断</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
