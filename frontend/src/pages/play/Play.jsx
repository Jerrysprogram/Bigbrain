import { useState, useEffect, useRef } from 'react';
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // 使用 useRef 来存储定时器
  const timerRef = useRef(null);
  const pollTimerRef = useRef(null);

  // 清理所有定时器
  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // 轮询游戏状态
  useEffect(() => {
    const pollGameStatus = async () => {
      try {
        const response = await fetch(`${BASE_URL}/play/${playerId}/status`);
        const data = await response.json();
        
        // 只在状态真正改变时更新
        setGameState(prev => {
          // 如果状态没有改变，返回之前的状态
          if (prev.started === data.started) {
            return prev;
          }
          
          return {
            ...prev,
            started: data.started,
            loading: false
          };
        });

        // 只在游戏开始时获取问题
        if (data.started && !gameState.started) {
          await fetchCurrentQuestion();
        }
      } catch (error) {
        console.error('Poll game status error:', error);
        setGameState(prev => ({
          ...prev,
          error: '获取游戏状态失败',
          loading: false
        }));
      }
    };

    // 增加轮询间隔到5秒
    pollGameStatus();
    pollTimerRef.current = setInterval(pollGameStatus, 5000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [playerId]);

  // 获取当前问题
  const fetchCurrentQuestion = async () => {
    try {
      const response = await fetch(`${BASE_URL}/play/${playerId}/question`);
      const data = await response.json();
      
      if (data.question) {
        const timeStarted = new Date(data.question.isoTimeLastQuestionStarted).getTime();
        const timeLeft = Math.max(0, Math.floor(data.question.duration - (Date.now() - timeStarted) / 1000));
        
        const questionData = {
          ...data.question,
          answers: data.question.answers || []
        };
        
        const isNewQuestion = questionData.id !== gameState.question?.id;
        
        if (isNewQuestion) {
          // 新问题时重置所有相关状态
          setSelectedAnswers([]);
          setHasSubmitted(false);
          setSubmitting(false);
        }

        setGameState(prev => ({
          ...prev,
          question: questionData,
          timeLeft,
          correctAnswers: null
        }));

        if (timeLeft > 0) {
          startCountdown(timeLeft);
        } else {
          await fetchAnswers();
        }
      }
    } catch (error) {
      console.error('Fetch question error:', error);
      setGameState(prev => ({
        ...prev,
        error: '获取问题失败'
      }));
    }
  };

  // 倒计时优化
  const startCountdown = (duration) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const endTime = Date.now() + duration * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setGameState(prev => {
        // 如果时间没有变化，不更新状态
        if (prev.timeLeft === remaining) {
          return prev;
        }
        return {
          ...prev,
          timeLeft: remaining
        };
      });

      if (remaining === 0) {
        clearInterval(timerRef.current);
        fetchAnswers();
      }
    };

    // 增加倒计时更新间隔到2秒
    timerRef.current = setInterval(updateTimer, 2000);
    updateTimer(); // 立即执行一次
  };

  // 获取答案
  const fetchAnswers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/play/${playerId}/answer`);
      const data = await response.json();
      
      if (data.answers) {
        setGameState(prev => ({
          ...prev,
          correctAnswers: data.answers
        }));
      } else {
        // 增加轮询间隔到3秒
        setTimeout(fetchAnswers, 3000);
      }
    } catch (error) {
      console.error('Fetch answers error:', error);
      // 增加轮询间隔到3秒
      setTimeout(fetchAnswers, 3000);
    }
  };

  // 提交答案
  const submitAnswer = async () => {
    if (submitting || hasSubmitted) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/play/${playerId}/answer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: selectedAnswers
        })
      });

      if (!response.ok) {
        throw new Error('提交答案失败');
      }

      setHasSubmitted(true);
      message.success('答案已提交');
    } catch (error) {
      console.error('Submit answer error:', error);
      message.error(error.message || '提交答案失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染媒体内容
  const renderMedia = () => {
    const { question } = gameState;
    if (!question) return null;

    if (question.image) {
      return (
        <div style={styles.mediaContainer}>
          <Image
            src={question.image}
            alt="问题图片"
            style={styles.image}
          />
        </div>
      );
    }

    if (question.video) {
      return (
        <div style={styles.mediaContainer}>
          <iframe
            src={question.video}
            title="问题视频"
            style={styles.iframe}
            allowFullScreen
          />
        </div>
      );
    }

    return null;
  };

  // 渲染答案选项
  const renderAnswerOptions = () => {
    const { question, correctAnswers } = gameState;
    if (!question || !question.answers) return null;

    return (
      <div style={styles.optionsContainer}>
        {question.type === 'multiple' ? (
          <Checkbox.Group
            value={selectedAnswers}
            onChange={setSelectedAnswers}
            disabled={!!correctAnswers || submitting || hasSubmitted}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.answers.map((answer, index) => (
                <Checkbox
                  key={index}
                  value={answer.text}
                  style={styles.option}
                >
                  {answer.text}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        ) : (
          <Radio.Group
            value={selectedAnswers[0]}
            onChange={(e) => setSelectedAnswers([e.target.value])}
            disabled={!!correctAnswers || submitting || hasSubmitted}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {question.answers.map((answer, index) => (
                <Radio
                  key={index}
                  value={answer.text}
                  style={styles.option}
                >
                  {answer.text}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </div>
    );
  };

  if (gameState.loading) {
    return (
      <div style={styles.container}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <Title level={4} type="danger">错误</Title>
          <Paragraph>{gameState.error}</Paragraph>
        </Card>
      </div>
    );
  }

  if (!gameState.started) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <Title level={3}>等待游戏开始</Title>
          <Paragraph>
            请等待管理员开始游戏，页面将自动更新...
          </Paragraph>
          <Spin />
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        {gameState.question && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Progress
                percent={Math.round((gameState.timeLeft / gameState.question.duration) * 100)}
                format={() => `${gameState.timeLeft}秒`}
                status={gameState.timeLeft > 5 ? 'active' : 'exception'}
              />
            </div>
            
            <Title level={4}>{gameState.question.text}</Title>
            
            {renderMedia()}
            {renderAnswerOptions()}

            {!gameState.correctAnswers && !hasSubmitted && gameState.timeLeft > 0 && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  onClick={submitAnswer}
                  disabled={selectedAnswers.length === 0 || submitting}
                  style={{
                    padding: '8px 24px',
                    fontSize: 16,
                    borderRadius: 4,
                    backgroundColor: '#1890ff',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: (selectedAnswers.length === 0 || submitting) ? 0.5 : 1
                  }}
                >
                  {submitting ? '提交中...' : '提交答案'}
                </button>
              </div>
            )}

            {gameState.correctAnswers && (
              <Card style={{ marginTop: 24, backgroundColor: '#f6ffed' }}>
                <Title level={5}>正确答案:</Title>
                <Paragraph>
                  {gameState.correctAnswers.join(', ')}
                </Paragraph>
              </Card>
            )}
          </>
        )}
      </Card>
    </div>
  );
}