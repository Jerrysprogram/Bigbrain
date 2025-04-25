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

// basic styles
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
    error: null,
    players: []
  });
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // use useRef to store timers
  const timerRef = useRef(null);
  const pollTimerRef = useRef(null);

  // clear all timers
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

  // clear all timers when component unmounts
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // 优化倒计时逻辑
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

    // 每秒更新一次倒计时
    timerRef.current = setInterval(updateTimer, 1000);
    updateTimer(); // 立即执行一次
  };

  // poll game status
  useEffect(() => {
    const pollGameStatus = async () => {
      try {
        const statusResponse = await fetch(`${BASE_URL}/play/${playerId}/status`);
        const statusData = await statusResponse.json();
        
        console.log('Game status:', statusData);

        setGameState(prev => ({
          ...prev,
          started: statusData.started,
          loading: false
        }));

        if (statusData.started) {
          try {
            const questionResponse = await fetch(`${BASE_URL}/play/${playerId}/question`);
            const questionData = await questionResponse.json();
            
            console.log('Question data:', questionData);

            if (questionData.question) {
              const timeStarted = new Date(questionData.question.isoTimeLastQuestionStarted).getTime();
              const currentTime = Date.now();
              const timeLeft = Math.max(0, Math.floor(questionData.question.duration - (currentTime - timeStarted) / 1000));
              
              // 只有在收到新问题时才重置答题状态
              const isNewQuestion = questionData.question.id !== gameState.question?.id;
              if (isNewQuestion) {
                setSelectedAnswers([]);
                setHasSubmitted(false);
                setSubmitting(false);
              }

              setGameState(prev => ({
                ...prev,
                position: questionData.question.position || 0,
                question: {
                  ...questionData.question,
                  answers: questionData.question.answers || []
                },
                timeLeft,
                correctAnswers: null
              }));

              // 只有在时间还没到且是新问题时才启动倒计时
              if (timeLeft > 0 && isNewQuestion) {
                startCountdown(timeLeft);
              } else if (timeLeft === 0) {
                await fetchAnswers();
              }
            }
          } catch (error) {
            console.error('Question fetch error:', error);
            if (error.message === 'Session has not started yet') {
              setGameState(prev => ({
                ...prev,
                position: -1,
                question: null
              }));
            } else {
              setGameState(prev => ({
                ...prev,
                error: 'Failed to fetch question'
              }));
            }
          }
        }
      } catch (error) {
        console.error('Status poll error:', error);
        setGameState(prev => ({
          ...prev,
          error: 'Failed to get game status',
          loading: false
        }));
      }
    };

    // 初始轮询
    pollGameStatus();
    
    // 降低轮询频率到4秒，给玩家更多答题时间
    pollTimerRef.current = setInterval(pollGameStatus, 4000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [playerId]);

  // fetch answers
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
        setTimeout(fetchAnswers, 3000);
      }
    } catch (error) {
      console.error('Fetch answers error:', error);
      setTimeout(fetchAnswers, 3000);
    }
  };

  // 优化提交答案逻辑
  const submitAnswer = async () => {
    if (submitting || hasSubmitted || gameState.timeLeft === 0) {
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
        throw new Error('Failed to submit answer');
      }

      setHasSubmitted(true);
      message.success('Answer submitted successfully');
    } catch (error) {
      console.error('Submit answer error:', error);
      message.error(error.message || 'Failed to submit answer');
      setHasSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  // render media content
  const renderMedia = () => {
    const { question } = gameState;
    if (!question) return null;

    if (question.image) {
      return (
        <div style={styles.mediaContainer}>
          <Image
            src={question.image}
            alt="question image"
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
            title="question video"
            style={styles.iframe}
            allowFullScreen
          />
        </div>
      );
    }

    return null;
  };

  // render answer options
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
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <Title level={4} type="danger">Error</Title>
          <Paragraph>{gameState.error}</Paragraph>
        </Card>
      </div>
    );
  }

  // 游戏未开始
  if (!gameState.started || gameState.position === -1) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <Title level={3}>Waiting for game to start</Title>
          <Paragraph>
            Please wait for the admin to start the game...
          </Paragraph>
          <Spin />
        </Card>
      </div>
    );
  }

  // 游戏进行中
  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        {gameState.question && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Progress
                percent={Math.round((gameState.timeLeft / gameState.question.duration) * 100)}
                format={() => `${gameState.timeLeft}s`}
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
                  {submitting ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            )}

            {gameState.correctAnswers && (
              <Card style={{ marginTop: 24, backgroundColor: '#f6ffed' }}>
                <Title level={5}>Correct Answers:</Title>
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