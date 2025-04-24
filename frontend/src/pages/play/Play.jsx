import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Spin, 
  Radio, 
  Checkbox, 
  Typography, 
  Progress, 
  message,
  Card,
  Space,
  Image
} from 'antd';
import config from '../../../backend.config.json';

const { Title, Paragraph } = Typography;
const BASE_URL = `http://localhost:${config.BACKEND_PORT}`;

// 基础样式
const styles = {
  container: {
    minHeight: '100vh',
    padding: '24px',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 800,
    marginTop: 16,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  mediaContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    maxHeight: 400,
    objectFit: 'cover'
  },
  iframe: {
    width: '100%',
    height: 400,
    border: 'none'
  },
  optionsContainer: {
    marginTop: 24
  },
  option: {
    marginBottom: 12,
    padding: '12px 16px',
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    transition: 'all 0.3s',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#1890ff',
      backgroundColor: '#f0f7ff'
    }
  }
};

export default function Play() {
  const { playerId } = useParams();
  const [gameState, setGameState] = useState({
    started: false,
    position: -1,
    question: null,
    answers: [],
    correctAnswers: null,
    results: null,
    timeLeft: 0,
    loading: true,
    error: null
  });
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // 轮询游戏状态
  useEffect(() => {
    const pollGameStatus = async () => {
      try {
        const response = await fetch(`${BASE_URL}/play/${playerId}/status`);
        const data = await response.json();
        
        if (data.started) {
          // 游戏已开始，获取当前问题
          await fetchCurrentQuestion();
        }
        
        setGameState(prev => ({
          ...prev,
          started: data.started,
          loading: false
        }));
      } catch (error) {
        setGameState(prev => ({
          ...prev,
          error: '获取游戏状态失败',
          loading: false
        }));
      }
    };

    const interval = setInterval(pollGameStatus, 1000);
    return () => clearInterval(interval);
  }, [playerId]);

  // 获取当前问题
  const fetchCurrentQuestion = async () => {
    try {
      const response = await fetch(`${BASE_URL}/play/${playerId}/question`);
      const data = await response.json();
      
      if (data.question) {
        const timeStarted = new Date(data.question.isoTimeLastQuestionStarted).getTime();
        const timeLeft = Math.max(0, Math.floor(data.question.duration - (Date.now() - timeStarted) / 1000));
        
        setGameState(prev => ({
          ...prev,
          question: data.question,
          timeLeft: timeLeft
        }));

        // 启动倒计时
        if (timeLeft > 0) {
          startCountdown(timeLeft);
        } else {
          // 时间到，获取正确答案
          await fetchAnswers();
        }
      }
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        error: '获取问题失败'
      }));
    }
  };

  // 倒计时
  const startCountdown = (duration) => {
    const timer = setInterval(() => {
      setGameState(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          clearInterval(timer);
          fetchAnswers();
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
  };