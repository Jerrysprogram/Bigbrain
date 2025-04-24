import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, Radio, Checkbox, List, Table, Typography, Progress, message } from 'antd';
import requests from '../../utills/requests';

const { Title, Paragraph } = Typography;

export default function Play() {
  const { playerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(null);
  const [results, setResults] = useState(null);
  const [timer, setTimer] = useState(0);

  // 轮询游戏状态：取 started, 进入问题, 或取最终结果
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { started } = await requests.get(`/play/${playerId}/status`);
        setStatus({ started });
        if (started && question === null) {
          // 游戏开始后取题
          const { question: q } = await requests.get(`/play/${playerId}/question`);
          setQuestion(q);
          setAnswers([]);
          setCorrectAnswers(null);
          setLoading(false);
          setTimer(q.duration);
        }
        if (!started && question !== null && results === null) {
          // 会话结束，取结果
          const rres = await requests.get(`/play/${playerId}/results`);
          setResults(rres);
          setLoading(false);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [playerId, question]);

  // 根据 timer 倒计时，到 0 时取本题答案
  useEffect(() => {
    if (question && correctAnswers === null) {
      if (timer <= 0) {
        requests.get(`/play/${playerId}/answer`).then(res => setCorrectAnswers(res.answers));
      } else {
        const id = setTimeout(() => setTimer(timer - 1), 1000);
        return () => clearTimeout(id);
      }
    }
  }, [timer, question, correctAnswers]);

  const submitAnswers = async (vals) => {
    try {
      await requests.put(`/play/${playerId}/answer`, { answers: vals });
      setAnswers(vals);
    } catch (err) {
      message.error(`Submit answer failed: ${err.message}`);
    }
  };

  if (loading || !status) {
    return <Spin tip="Loading..." />;
  }

  // not started
  if (!status.started && question === null) {
    return (
      <div className="lobby-screen">
        <Title level={2}>Welcome to BigBrain Lobby</Title>
        <Paragraph>Please wait until the host starts the game...</Paragraph>
        {/* 你可以加个动画、Logo、倒计时等 */}
      </div>
    );
  }

  // final results
  if (!status.started && results) {
    // merge question results with scoring
    const merged = results.map((ans, idx) => ({
      key: idx,
      question: idx + 1,
      time: Math.round((new Date(ans.answeredAt) - new Date(ans.questionStartedAt)) / 1000),
      correct: ans.correct ? 'Yes' : 'No',
      points: ans.correct ? (status.questions[idx]?.points || 0) : 0,
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
  if (status.started && question && correctAnswers === null) {
    const type = question.type;
    let inputComponent;
    if (type === 'single' || type === 'judgement') {
      const options = type === 'judgement'
        ? ['True', 'False']
        : question.answers.map(ans => ans.text);
      inputComponent = (
        <Radio.Group onChange={e => submitAnswers([e.target.value])} value={answers[0]}>
          {options.map((opt, idx) => (
            <Radio key={idx} value={opt}>{opt}</Radio>
          ))}
        </Radio.Group>
      );
    } else {
      inputComponent = (
        <Checkbox.Group
          options={question.answers.map((ans, idx) => ({ label: ans.text, value: ans.text }))}
          value={answers}
          onChange={submitAnswers}
        />
      );
    }
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Question: {question.text}</Title>
        <Progress percent={(timer / question.duration) * 100} status="active" />
        {inputComponent}
      </div>
    );
  }

  // answer feedback
  if (status.started && question && correctAnswers) {
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