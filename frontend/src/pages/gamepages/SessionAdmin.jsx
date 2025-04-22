import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Table, Space } from 'antd';
import requests from '../../utills/requests';

export default function SessionAdmin() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

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
      return s;
    } catch (err) {
      message.error(`Fetch status failed: ${err.message}`);
    }
  };

  // 拉取结果
  const fetchResults = async () => {
    try {
      const res = await requests.get(`/admin/session/${sessionId}/results`);
      setResults(res);
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


