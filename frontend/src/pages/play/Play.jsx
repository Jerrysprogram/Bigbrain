import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, Radio, Checkbox, List, Table, Typography, Progress, message } from 'antd';
import requests from '../../utills/requests';

const { Title, Paragraph } = Typography;

export default function Play() {
  const { playerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gameState, setGameState] = useState({
    started: false,
    position: -1,
    question: null,
    answers: [],
    correctAnswers: null,
    results: null,
    timeLeft: 0
  });

  // 1. 轮询游戏状态
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await requests.get(`/play/${playerId}/status`);
        console.log('游戏状态:', res);
        setGameState(prev => ({
          ...prev,
          started: res.started,
          position: res.position || -1  // 更新position
        }));

        // 如果游戏已经开始，获取当前问题
        if (res.started && res.position >= 0) {  // 修改判断条件
          try {
            const { question } = await requests.get(`/play/${playerId}/question`);
            if (question) {
              // 计算剩余时间
              const elapsed = (Date.now() - new Date(res.isoTimeLastQuestionStarted).getTime()) / 1000;
              const timeLeft = Math.max(question.duration - elapsed, 0);
              
              setGameState(prev => ({
                ...prev,
                question,
                position: res.position,  // 确保position同步
                timeLeft,
                answers: [], // 新题目清空答案
                correctAnswers: null // 清空正确答案
              }));
              setLoading(false);
            }
          } catch (e) {
            console.error('Error fetching question:', e);
          }
        } else {
          setLoading(false);  // 即使游戏未开始也要设置loading为false
        }

        // 游戏结束检查
        if (!res.started && gameState.started) {
          try {
            const results = await requests.get(`/play/${playerId}/results`);
            setGameState(prev => ({
              ...prev,
              results
            }));
          } catch (e) {
            console.error('Error fetching results:', e);
          }
        }
      } catch (e) {
        console.error('Error polling status:', e);
        setLoading(false);  // 出错时也要设置loading为false
      }
    };

    const statusInterval = setInterval(pollStatus, 1000);
    pollStatus(); // 立即执行一次
    return () => clearInterval(statusInterval);
  }, [playerId, gameState.started]);  // 添加gameState.started作为依赖

  // 2. 倒计时
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

  // 3. 时间到获取答案
  useEffect(() => {
    if (!gameState.started || !gameState.question || gameState.timeLeft > 0 || gameState.correctAnswers) return;

    const getAnswers = async () => {
      try {
        const res = await requests.get(`/play/${playerId}/answer`);
        setGameState(prev => ({
          ...prev,
          correctAnswers: res.answers
        }));
      } catch (e) {
        console.error('Error getting answers:', e);
      }
    };

    getAnswers();
  }, [gameState.timeLeft, gameState.started, gameState.question, gameState.correctAnswers]);

  // 提交答案
  const submitAnswers = async (values) => {
    try {
      // 检查游戏状态
      if (gameState.position === -1) {
        message.error('游戏尚未开始，请等待');
        return;
      }

      if (gameState.timeLeft <= 0) {
        message.error('时间已到，无法提交答案');
        return;
      }
      
      if (submitting) {
        message.warning('正在提交答案，请稍候');
        return;
      }

      setSubmitting(true);
      // 确保答案是一个数组
      const answers = Array.isArray(values) ? values : [values];
      console.log('提交答案信息:', {
        answers,
        playerId,
        gameState: {
          position: gameState.position,
          started: gameState.started,
          timeLeft: gameState.timeLeft,
          question: gameState.question
        }
      });
      
      // 发送答案数组，包装在对象中
      const response = await requests.put(`/play/${playerId}/answer`, { answersFromRequest: answers });
      console.log('提交答案响应:', response);
      
      setGameState(prev => ({
        ...prev,
        answers
      }));
      message.success('答案已提交');
    } catch (err) {
      console.error('提交答案错误详情:', {
        error: err,
        message: err.message,
        stack: err.stack,
        values: values,
        playerId: playerId,
        gameState: {
          position: gameState.position,
          started: gameState.started,
          timeLeft: gameState.timeLeft,
          question: gameState.question
        }
      });
      
      if (err.message.includes('Player ID does not refer to valid player id')) {
        message.error('玩家ID无效，请重新加入游戏');
      } else if (err.message.includes('Session has not started yet')) {
        message.error('游戏尚未开始，请等待');
      } else if (err.message.includes('Can\'t answer question once answer is available')) {
        message.error('答案已公布，无法提交');
      } else {
        message.error('提交答案失败: ' + (err.message || '未知错误'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spin tip="Loading..." />;
  }

  // 等待游戏开始
  if (!gameState.started || gameState.position === -1) {  // 修改判断条件
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={2}>Welcome to BigBrain</Title>
        <Paragraph>Please wait for the game to start...</Paragraph>
        <Paragraph>Game Status: {gameState.started ? 'Started but waiting for first question' : 'Not started'}</Paragraph>
      </div>
    );
  }

  // 显示最终结果
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

  // 显示问题
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
          disabled={submitting || gameState.timeLeft <= 0}
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
          disabled={submitting || gameState.timeLeft <= 0}
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
        {submitting && <Spin tip="正在提交答案..." />}
        {answerComponent}
      </div>
    );
  }

  // 显示答案
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