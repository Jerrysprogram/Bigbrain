import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Radio, Checkbox, Table, Typography, Progress } from 'antd';
import requests from '../../utills/requests';

const { Title, Paragraph } = Typography;

export default function Play() {
  const { playerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState({
    started: false,
    position: -1,
    question: null,
    answers: [],
    correctAnswers: null,
    results: null,
    timeLeft: 0
  });

  // Poll game status
  useEffect(() => {
    const pollStatus = async () => {
      const res = await requests.get(`/play/${playerId}/status`);
      console.log('Game status:', res);
      setGameState(prev => ({
        ...prev,
        started: res.started,
        position: res.position || -1
      }));

      // If game has started, fetch current question
      if (res.started && res.position >= 0) {
        const { question } = await requests.get(`/play/${playerId}/question`);
        if (question) {
          // Calculate remaining time
          const elapsed = (Date.now() - new Date(res.isoTimeLastQuestionStarted).getTime()) / 1000;
          const timeLeft = Math.max(question.duration - elapsed, 0);
          
          setGameState(prev => ({
            ...prev,
            question,
            position: res.position,
            timeLeft,
            answers: [],
            correctAnswers: null,
          }));
        }
      }

      // Check for game end
      if (!res.started && gameState.started) {
        const results = await requests.get(`/play/${playerId}/results`);
        setGameState(prev => ({
          ...prev,
          results
        }));
      }

      setLoading(false);
    };

    const statusInterval = setInterval(pollStatus, 1000);
    pollStatus();
    return () => clearInterval(statusInterval);
  }, [playerId, gameState.started]);

  // Countdown timer
  useEffect(() => {
    if (!gameState.started || !gameState.question || gameState.timeLeft <= 0) return;

    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: Math.max(prev.timeLeft - 1, 0)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.started, gameState.question, gameState.timeLeft]);

  // Fetch answers when timer ends
  useEffect(() => {
    if (!gameState.started || !gameState.question || gameState.timeLeft > 0 || gameState.correctAnswers) return;

    const getAnswers = async () => {
      const res = await requests.get(`/play/${playerId}/answer`);
      setGameState(prev => ({
        ...prev,
        correctAnswers: res.answers
      }));
    };

    getAnswers();
  }, [gameState.timeLeft, gameState.started, gameState.question, gameState.correctAnswers]);

  // Submit answer
  const submitAnswers = async (values) => {
    if (!values) return;
    
    // Ensure answer is an array
    const answers = Array.isArray(values) ? values : [values];
    
    await requests.put(`/play/${playerId}/answer`, { answers });
    
    setGameState(prev => ({
      ...prev,
      answers
    }));
  };

  if (loading) {
    return <Spin tip="Loading..." />;
  }

  // Waiting for game to start
  if (!gameState.started || gameState.position === -1) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={2}>Welcome to BigBrain</Title>
        <Paragraph>Please wait for the game to start...</Paragraph>
        <Paragraph>Game Status: {gameState.started ? 'Started but waiting for first question' : 'Not started'}</Paragraph>
      </div>
    );
  }

  // Show final results
  if (!gameState.started && gameState.results) {
    const resultData = gameState.results.map((ans, idx) => ({
      key: idx,
      question: idx + 1,
      time: Math.round((new Date(ans.answeredAt) - new Date(ans.questionStartedAt)) / 1000),
      correct: ans.correct ? 'Yes' : 'No',
      points: ans.correct ? (gameState.question?.points || 0) : 0,
    }));

    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>Game Results</Title>
        <Table
          dataSource={resultData}
          columns={[
            { title: 'Question', dataIndex: 'question' },
            { title: 'Time (s)', dataIndex: 'time' },
            { title: 'Correct', dataIndex: 'correct' },
            { title: 'Points', dataIndex: 'points' },
          ]}
          pagination={false}
        />
      </div>
    );
  }

  // Show question
  if (gameState.question && !gameState.correctAnswers) {
    const { question } = gameState;
    const type = question.type || 'single';

    let answerComponent;
    if (type === 'single' || type === 'judgement') {
      const options = type === 'judgement'
        ? ['True', 'False']
        : (question.answers || []).map(a => a.text || a);

      answerComponent = (
        <Radio.Group
          onChange={e => submitAnswers(e.target.value)}
          value={gameState.answers[0]}
          disabled={gameState.timeLeft <= 0}
        >
          {options.map((opt, idx) => (
            <Radio key={idx} value={opt} style={{ display: 'block', marginBottom: 8 }}>
              {opt}
            </Radio>
          ))}
        </Radio.Group>
      );
    } else {
      const options = (question.answers || []).map(a => ({
        label: a.text || a,
        value: a.text || a
      }));

      answerComponent = (
        <Checkbox.Group
          options={options}
          value={gameState.answers}
          onChange={submitAnswers}
          disabled={gameState.timeLeft <= 0}
        />
      );
    }

    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>{question.text}</Title>
        {question.media && (
          <div style={{ marginBottom: 16 }}>
            {question.media.type === 'image' ? (
              <img src={question.media.url} alt="Question" style={{ maxWidth: '100%' }} />
            ) : (
              <iframe
                width="100%"
                height="315"
                src={question.media.url}
                title="Question Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={(gameState.timeLeft / question.duration) * 100}
            format={() => `${Math.ceil(gameState.timeLeft)}s`}
            status="active"
          />
        </div>
        {answerComponent}
      </div>
    );
  }

  // Show answer
  if (gameState.question && gameState.correctAnswers) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Time's up!</Title>
        <Paragraph>
          Correct answer(s): {gameState.correctAnswers.join(', ')}
        </Paragraph>
        <Paragraph>
          Your answer(s): {gameState.answers.join(', ')}
        </Paragraph>
        <Paragraph>
          {gameState.answers.sort().toString() === gameState.correctAnswers.sort().toString()
            ? '✅ Correct!'
            : '❌ Wrong answer'}
        </Paragraph>
      </div>
    );
  }

  return null;
}