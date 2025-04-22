import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Tabs,
  Checkbox,
  Space,
  Button,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import requests from '../../utills/requests';

const { TabPane } = Tabs;
const { Option } = Select;

export default function QuestionEdit() {
  const { gameId, questionId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');

  // 加载游戏和题目信息
  useEffect(() => {
    async function load() {
      try {
        const { games } = await requests.get('/admin/games');
        const g = games.find(g => g.id === +gameId);
        if (!g) throw new Error('游戏未找到');
        setGame(g);
        const q = g.questions.find(q => q.id === +questionId);
        if (!q) throw new Error('题目未找到');
        // 初始化 form
        form.setFieldsValue({
          type: q.type,
          text: q.text,
          duration: q.duration,
          points: q.points,
          answers: (q.answers || []).map(a => ({ text: a.text, isCorrect: a.isCorrect })),
        });
        // 媒体
        if (q.image) {
          setFileList([{ uid: '-1', url: q.image, thumbUrl: q.image }]);
        }
        if (q.video) setVideoUrl(q.video);
      } catch (err) {
        message.error(`加载失败: ${err.message}`);
      }
    }
    load();
  }, [gameId, questionId]);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      // 构建更新后的题目对象
      const updated = {
        id: +questionId,
        type: vals.type,
        text: vals.text,
        duration: vals.duration,
        points: vals.points,
        image: fileList[0]?.thumbUrl || fileList[0]?.url || null,
        video: videoUrl || null,
        answers: vals.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
      };
      // 更新题目列表
      const newQuestions = game.questions.map(q =>
        q.id === updated.id ? updated : q
      );
      // 更新游戏在所有游戏数组中的条目
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g =>
        g.id === +gameId ? { ...g, questions: newQuestions } : g
      );
      await requests.put('/admin/games', { games: updatedAll });
      message.success('题目已保存');
      navigate(`/game/${gameId}`);
    } catch (err) {
      message.error(`保存失败: ${err.message}`);
    }
  };

  if (!game) {
    return <div>加载中…</div>;
  }
