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


