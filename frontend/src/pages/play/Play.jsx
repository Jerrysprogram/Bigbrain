import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Radio, Checkbox, Table, Typography, Progress, message } from 'antd';
import config from '../../../backend.config.json';

const { Title, Paragraph } = Typography;
const BASE_URL = `http://localhost:${config.BACKEND_PORT}`;

export default function Play() {
  const { playerId } = useParams();
  const [gameState, setGameState] = useState({
    started: false,
    position: -1,
    question: null,
    answers: [],
    correctAnswers: null,
    results: null,
    timeLeft: 0
  });

  // 获取游戏状态
  useEffect(() => {
    const pollStatus = async () => {
      try {
        // 1. 获取游戏状态
        const statusResponse = await fetch(`${BASE_URL}/play/${playerId}/status`);
        const statusData = await statusResponse.json();
        if (statusData.error) throw new Error(statusData.error);

        // 更新游戏状态
        const newState = {
          ...gameState,
          started: statusData.started,
          position: statusData.position || -1
        };

        // 2. 如果游戏已开始且有当前问题，获取问题详情
        if (statusData.started && statusData.position >= 0) {
          const questionResponse = await fetch(`${BASE_URL}/play/${playerId}/question`);
          const questionData = await questionResponse.json();
          if (questionData.error) throw new Error(questionData.error);

          if (questionData.question) {
            const elapsed = (Date.now() - new Date(questionData.question.isoTimeLastQuestionStarted).getTime()) / 1000;
            const timeLeft = Math.max(questionData.question.duration - elapsed, 0);
            
            newState.question = questionData.question;
            newState.timeLeft = timeLeft;
            newState.answers = [];
            newState.correctAnswers = null;
          }
        }

        // 3. 如果游戏结束，获取结果
        if (!statusData.started && gameState.started) {
          const resultsResponse = await fetch(`${BASE_URL}/play/${playerId}/results`);
          const resultsData = await resultsResponse.json();
          if (resultsData.error) throw new Error(resultsData.error);
          
          newState.results = resultsData;
        }

        setGameState(newState);
      } catch (error) {
        message.error(error.message);
      }
    };

    const statusInterval = setInterval(pollStatus, 1000);
    pollStatus();
    return () => clearInterval(statusInterval);
  }, [playerId]);

  // ... 其他代码将在后续部分添加 ...
  return <Spin tip="Loading..." />;
}