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
  Image,
  Button
} from 'antd';
import config from '../../../backend.config.json';
import { CheckCircleOutlined } from '@ant-design/icons';
import './Play.css';

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
    correctAnswers: null,
    timeLeft: 0,
    loading: true,
    error: null,
    questionActive: false,
    questionId: null,
    gameEnded: false
  });

  // 新增：单独的状态来管理选项
  const [answerState, setAnswerState] = useState({
    selectedAnswers: [],
    hasSubmitted: false,
    submitting: false
  });

  // 修改：使用answerState替代原来的状态
  const { selectedAnswers, hasSubmitted, submitting } = answerState;

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

  // start countdown
  const startCountdown = (duration) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const endTime = Date.now() + duration * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setGameState(prev => {
        // if time left is not changed, do not update state
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
        setGameState(prev => ({
          ...prev,
          questionActive: false
        }));
      }
    };

    // update countdown every second
    timerRef.current = setInterval(updateTimer, 1000);
    updateTimer(); // execute once immediately
  };

  // poll game status
  useEffect(() => {
    const pollGameStatus = async () => {
      try {
        const statusResponse = await fetch(`${BASE_URL}/play/${playerId}/status`);
        // 若 status 接口返回非 2xx，表示会话已结束
        if (!statusResponse.ok) {
          setGameState(prev => ({ ...prev, gameEnded: true }));
          return;
        }
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
            
            // 检测后端返回错误：Question not found 表示游戏结束
            if (!questionResponse.ok && questionData.error === 'Question not found') {
              setGameState(prev => ({ ...prev, gameEnded: true }));
              return;
            }

            console.log('Question data:', questionData);

            if (questionData.question) {
              const timeStarted = new Date(questionData.question.isoTimeLastQuestionStarted).getTime();
              const currentTime = Date.now();
              const timeLeft = Math.max(0, Math.floor(questionData.question.duration - (currentTime - timeStarted) / 1000));
              
              setGameState(prev => {
                const isNewQuestion = questionData.question.id !== prev.questionId;
                if (isNewQuestion) {
                  // 只有真正的新问题才重置 answerState
                  setAnswerState({ selectedAnswers: [], hasSubmitted: false, submitting: false });
                  if (timeLeft > 0) startCountdown(timeLeft);
                  return {
                    ...prev,
                    questionActive: timeLeft > 0,
                    questionId: questionData.question.id,
                    position: questionData.question.position,
                    question: { ...questionData.question, answers: questionData.question.answers },
                    timeLeft,
                    correctAnswers: null
                  };
                } else {
                  // 不是新问题就只更新时间，不动 answerState
                  return { ...prev, timeLeft };
                }
              });
            }
          } catch (error) {
            console.error('Question fetch error:', error);
            if (error.message === 'Session has not started yet') {
              setGameState(prev => ({
                ...prev,
                position: -1,
                question: null,
                questionActive: false,
                questionId: null
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

    pollGameStatus();
    pollTimerRef.current = setInterval(pollGameStatus, 5000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [playerId]);

  // 游戏结束后展示页面
  if (gameState.gameEnded) {
    return (
      <div className="container">
        <Card className="card">
          <Title level={3}>Game Ended</Title>
          <Paragraph>The game has ended. Thank you for playing!</Paragraph>
        </Card>
      </div>
    );
  }

  // modify submit button render logic
  const renderSubmitButton = () => {
    // if answer has been submitted, show submitted status
    if (hasSubmitted) {
      return (
        <div className="submitButton">
          <Button
            type="default"
            disabled
            icon={<CheckCircleOutlined />}
            className="submittedButton"
          >
            Answer Submitted
          </Button>
        </div>
      );
    }

    // if answer has not been submitted and question is active, show submit button
    if (!hasSubmitted && gameState.questionActive) {
      return (
        <div className="submitButton">
          <Button
            type="primary"
            onClick={submitAnswer}
            disabled={selectedAnswers.length === 0 || submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </div>
      );
    }

    return null;
  };

  // optimize submit answer logic
  const submitAnswer = async () => {
    // if answer has been submitted or question is not active, return
    if (submitting || hasSubmitted || !gameState.questionActive) {
      return;
    }

    setAnswerState(prev => ({ ...prev, submitting: true }));

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

      setAnswerState(prev => ({
        ...prev,
        hasSubmitted: true,
        submitting: false
      }));
      message.success('Answer submitted successfully');
    } catch (error) {
      console.error('Submit answer error:', error);
      message.error(error.message || 'Failed to submit answer');
      setAnswerState(prev => ({ ...prev, submitting: false }));
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

  // modify answer options render logic
  const renderAnswerOptions = () => {
    const { question, correctAnswers } = gameState;
    if (!question || !question.answers) return null;

    // 只有在已提交或显示正确答案时才禁用选项
    const isDisabled = hasSubmitted || !!correctAnswers;

    const handleAnswerChange = (values) => {
      // 只有在未提交且未显示正确答案时才允许更改选项
      if (!isDisabled) {
        setAnswerState(prev => ({ ...prev, selectedAnswers: values }));
      }
    };

    return (
      <div className="optionsContainer">
        {question.type === 'multiple' ? (
          <Checkbox.Group
            value={selectedAnswers}
            onChange={handleAnswerChange}
            disabled={isDisabled}
          >
            <Space direction="vertical" className="answerSpace">
              {question.answers.map((answer, index) => (
                <Checkbox
                  key={index}
                  value={answer.text}
                  className={`option ${isDisabled ? 'disabled' : ''}`}
                >
                  {answer.text}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        ) : (
          <Radio.Group
            value={selectedAnswers[0]}
            onChange={(e) => handleAnswerChange([e.target.value])}
            disabled={isDisabled}
          >
            <Space direction="vertical" className="answerSpace">
              {question.answers.map((answer, index) => (
                <Radio
                  key={index}
                  value={answer.text}
                  className={`option ${isDisabled ? 'disabled' : ''}`}
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
      <div className="container">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div className="container">
        <Card className="card">
          <Title level={4} type="danger">Error</Title>
          <Paragraph>{gameState.error}</Paragraph>
        </Card>
      </div>
    );
  }

  // game not started
  if (!gameState.started || gameState.position === -1) {
    return (
      <div className="container">
        <Card className="card">
          <Title level={3}>Waiting for game to start</Title>
          <Paragraph>
            Please wait for the admin to start the game...
          </Paragraph>
          <Spin />
        </Card>
      </div>
    );
  }

  // game in progress
  return (
    <div className="container">
      <Card className="card">
        {gameState.question && (
          <>
            <div className="progressContainer">
              <Progress
                percent={Math.round((gameState.timeLeft / gameState.question.duration) * 100)}
                format={() => `${gameState.timeLeft}s`}
                status={gameState.timeLeft > 5 ? 'active' : 'exception'}
              />
            </div>
            
            <Title level={4}>{gameState.question.text}</Title>
            
            {renderMedia()}
            {renderAnswerOptions()}
            {renderSubmitButton()}

            {gameState.correctAnswers && (
              <Card className="correctAnswers">
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