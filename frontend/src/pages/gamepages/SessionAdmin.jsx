import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Table, Space, Card } from 'antd';
import requests from '../../utills/requests';

export default function SessionAdmin() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);

  // 初始化：获取对应 gameId
  useEffect(() => {
    async function init() {
      try {
        const { games } = await requests.get('/admin/games');
        const g = games.find(g => g.active === +sessionId || (g.oldSessions || []).includes(+sessionId));
        if (!g) throw new Error('Game for this session not found');
        setGameId(g.id);
      } catch (err) {
        message.error(`Initialize failed: ${err.message}`);
      }
    }
    init();
  }, [sessionId]);

  // 拉取 session 状态
  const fetchStatus = async () => {
    try {
      const { results: s } = await requests.get(`/admin/session/${sessionId}/status`);
      setStatus(s);
      // 初始化/更新倒计时
      if (s.active) {
        const elapsed = (Date.now() - new Date(s.isoTimeLastQuestionStarted).getTime()) / 1000;
        const duration = s.questions[s.position]?.duration || 0;
        setTimer(Math.max(duration - elapsed, 0));
      } else {
        setTimer(0);
      }
      return s;
    } catch (err) {
      message.error(`Fetch status failed: ${err.message}`);
    }
  };

  // 拉取结果
  const fetchResults = async () => {
    try {
      const data = await requests.get(`/admin/session/${sessionId}/results`);
      // API may return plain array or object with results property
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      message.error(`Fetch results failed: ${err.message}`);
    }
  };

  // 初始化拉取状态
  useEffect(() => {
    async function load() {
      setLoading(true);
      const s = await fetchStatus();
      if (s && !s.active) {
        await fetchResults();
      }
      setLoading(false);
    }
    if (gameId) load();
  }, [gameId]);

  // 推进下一题
  const handleAdvance = async () => {
    try {
      await requests.post(`/admin/game/${gameId}/mutate`, { mutationType: 'ADVANCE' });
      const s = await fetchStatus();
      if (s && !s.active) await fetchResults();
    } catch (err) {
      message.error(`Advance failed: ${err.message}`);
    }
  };

  // 停止会话
  const handleStop = async () => {
    try {
      await requests.post(`/admin/game/${gameId}/mutate`, { mutationType: 'END' });
      message.success('Session stopped');
      const s = await fetchStatus();
      if (s && !s.active) await fetchResults();
    } catch (err) {
      message.error(`Stop failed: ${err.message}`);
    }
  };

  // 倒计时 effect：当会话活跃时每秒递减 timer
  useEffect(() => {
    let timerId;
    if (status && status.active) {
      timerId = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [status]);

  if (loading || !status) {
    return <Spin tip="Loading session..." />;
  }

  // 活跃会话界面
  if (status.active) {
    const total = status.questions.length;
    const pos = status.position;
    // 计算剩余秒
    const remaining = timer;
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>游戏会话: {sessionId}</h2>
          <div>
            <Button onClick={() => {
              fetchStatus().then(s => { if (!s.active) fetchResults(); });
            }} style={{ marginRight: 8 }}>刷新</Button>
            <Button onClick={() => navigate('/dashboard')} type="primary">返回仪表盘</Button>
          </div>
        </div>
        <Card size="small" style={{ marginBottom: 16 }}>
          <p><strong>游戏进行中</strong></p>
          <p>当前问题: {status.questions[pos]?.text || ''} ({pos + 1}/{total})</p>
          <p>答题倒计时: {Math.round(remaining)} 秒</p>
          <p>在线玩家数: {status.players.length}</p>
        </Card>
        <Space>
          <Button
            type="primary"
            onClick={handleAdvance}
            disabled={status.players.length === 0}
          >
            下一题
          </Button>
          <Button danger onClick={handleStop}>结束会话</Button>
        </Space>
      </div>
    );
  }

  // 会话结束，展示结果
  // 计算分数
  const scores = (results || []).map(player => {
    const score = player.answers.reduce((sum, ans, idx) => sum + (ans.correct ? (status.questions[idx].points || 0) : 0), 0);
    return { name: player.name, score };
  });
  const top5 = scores.sort((a, b) => b.score - a.score).slice(0, 5);

  const columns = [
    { title: 'Player', dataIndex: 'name', key: 'name' },
    { title: 'Score', dataIndex: 'score', key: 'score' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>Results for Session {sessionId}</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
      <Table dataSource={top5} columns={columns} rowKey="name" pagination={false} />
    </div>
  );
}
