import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, Radio, Checkbox, List, Table, Typography, Progress, message } from 'antd';
import requests from '../../utills/requests';

const { Title, Paragraph } = Typography;

export default function Play() {
  const { playerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(null);
  const [results, setResults] = useState(null);
  const [timer, setTimer] = useState(0);

  // 1. 轮询会话是否开始
  useEffect(() => {
    let interval = null;
    const pollStart = async () => {
      try {
        const res = await requests.get(`/play/${playerId}/status`);
        const { started: startedResp } = res;
        if (startedResp && !started) {
          setStarted(true);
          const { question: q } = await requests.get(`/play/${playerId}/question`);
          if (q) {
            setQuestion(q);
            setAnswers([]);
            setCorrectAnswers(null);
            // 根据接口时间初始化倒计时
            const elapsed = (Date.now() - new Date(q.isoTimeLastQuestionStarted).getTime()) / 1000;
            setTimer(Math.max(q.duration - elapsed, 0));
            setLoading(false);
          }
        }
      } catch (e) {
        console.error('Poll start error:', e);
      }
    };
    interval = setInterval(pollStart, 1000);
    pollStart();
    return () => clearInterval(interval);
  }, [playerId, started]);

  // 2. 轮询新题目
  useEffect(() => {
    if (!started || !question) return;
    const qInterval = setInterval(async () => {
      try {
        const { question: q } = await requests.get(`/play/${playerId}/question`);
        if (q && q.isoTimeLastQuestionStarted !== question.isoTimeLastQuestionStarted) {
          setQuestion(q);
          setAnswers([]);
          setCorrectAnswers(null);
          const elapsed = (Date.now() - new Date(q.isoTimeLastQuestionStarted).getTime()) / 1000;
          setTimer(Math.max(q.duration - elapsed, 0));
        }
      } catch (e) {
        console.error('Poll question error:', e);
      }
    }, 1000);
    return () => clearInterval(qInterval);
  }, [playerId, started, question]);

  // 3. 倒计时和自动获取答案
  useEffect(() => {
    if (!started || !question || correctAnswers) return;
    
    if (timer <= 0) {
      requests.get(`/play/${playerId}/answer`)
        .then(res => {
          if (res && res.answers) {
            setCorrectAnswers(res.answers);
          }
        })
        .catch(e => console.error('Get answer error:', e));
    } else {
      const id = setTimeout(() => setTimer(t => Math.max(t - 1, 0)), 1000);
      return () => clearTimeout(id);
    }
  }, [timer, question, correctAnswers, started, playerId]);

  const submitAnswers = async (vals) => {
    try {
      if (!Array.isArray(vals)) {
        vals = [vals]; // 确保 vals 是数组
      }
      await requests.put(`/play/${playerId}/answer`, { answers: vals });
      setAnswers(vals);
    } catch (err) {
      message.error(`Submit answer failed: ${err.message}`);
    }
  };

  if (loading) return <Spin tip="Loading..." />;

  // not started
  if (!started && !question) {
    return (
      <div className="lobby-screen">
        <Title level={2}>Welcome to BigBrain Lobby</Title>
        <Paragraph>Please wait until the host starts the game...</Paragraph>
        {/* 你可以加个动画、Logo、倒计时等 */}
      </div>
    );
  }

  // final results
  if (!started && results) {
    // merge question results with scoring
    const merged = results.map((ans, idx) => ({
      key: idx,
      question: idx + 1,
      time: Math.round((new Date(ans.answeredAt) - new Date(ans.questionStartedAt)) / 1000),
      correct: ans.correct ? 'Yes' : 'No',
      points: ans.correct ? (question?.points || 0) : 0,
    }));
    const totalScore = merged.reduce((sum, row) => sum + row.points, 0);
    const columns = [
      { title: 'Question', dataIndex: 'question', key: 'question' },
      { title: 'Time(s)', dataIndex: 'time', key: 'time' },
      { title: 'Correct', dataIndex: 'correct', key: 'correct' },
      { title: 'Points', dataIndex: 'points', key: 'points' },
    ];
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>Your Results</Title>
        <Paragraph>Total Score: {totalScore}</Paragraph>
        <Table dataSource={merged} columns={columns} pagination={false} />
      </div>
    );
  }

  // question ongoing
  if (question && !correctAnswers) {
    const type = question.type || 'single'; // 默认为单选
    let inputComponent;
    if (type === 'single' || type === 'judgement') {
      const options = type === 'judgement'
        ? ['True', 'False']
        : (question.answers || []).map(ans => ans.text || ans);
      inputComponent = (
        <Radio.Group onChange={e => submitAnswers([e.target.value])} value={answers[0]}>
          {options.map((opt, idx) => (
            <Radio key={idx} value={opt}>{opt}</Radio>
          ))}
        </Radio.Group>
      );
    } else {
      const options = (question.answers || []).map((ans, idx) => ({
        label: ans.text || ans,
        value: ans.text || ans
      }));
      inputComponent = (
        <Checkbox.Group
          options={options}
          value={answers}
          onChange={vals => submitAnswers(vals)}
        />
      );
    }
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Question: {question.text}</Title>
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={Math.round((timer / question.duration) * 100)} 
            status="active"
            format={percent => `${Math.ceil(timer)}s`}
          />
        </div>
        {inputComponent}
      </div>
    );
  }

  // answer feedback
  if (question && correctAnswers) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Correct Answers: {correctAnswers.join(', ')}</Title>
        <Paragraph>You answered: {answers.join(', ')}</Paragraph>
        <Paragraph>{answers.sort().toString() === correctAnswers.sort().toString() ? 'You are correct!' : 'Wrong answer.'}</Paragraph>
      </div>
    );
  }

  return null;
} 