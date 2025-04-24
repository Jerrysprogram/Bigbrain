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

  // 1) 修复初次开始判断，改名解构、正确判断前后状态
  useEffect(() => {
    let interval = null;
    const pollStart = async () => {
      const res = await requests.get(`/play/${playerId}/status`);
      const { started: startedResp } = res;
      if (startedResp && !started) {   // 正确检测"接口已 start 且本地还没 start"
        setStarted(true);
        setLoading(false);
        const { question: q } = await requests.get(`/play/${playerId}/question`);
        setQuestion(q);
        setAnswers([]);
        setCorrectAnswers(null);
        // 根据接口时间初始化倒计时：要计算 elapsed，再 setTimer(duration-elapsed)
        const elapsed = (Date.now() - new Date(q.isoTimeLastQuestionStarted).getTime())/1000;
        setTimer(Math.max(q.duration - elapsed,0));
        clearInterval(interval);
      }
    }
    interval = setInterval(pollStart, 1000);
    pollStart();
    return () => clearInterval(interval);
  }, [playerId, started]);

  // 2) 新增"管理端 advance 后切题"轮询
  useEffect(() => {
    if (!started || !question) return;
    const qInterval = setInterval(async () => {
      const { question: q } = await requests.get(`/play/${playerId}/question`);
      if (q.isoTimeLastQuestionStarted !== question.isoTimeLastQuestionStarted) {
        // 切题
        setQuestion(q);
        setAnswers([]);
        setCorrectAnswers(null);
        const elapsed = (Date.now() - new Date(q.isoTimeLastQuestionStarted).getTime())/1000;
        setTimer(Math.max(q.duration - elapsed,0));
      }
    }, 1000);
    return () => clearInterval(qInterval);
  }, [playerId, started, question]);

  // 2. 基于前端倒计时，到0时自动取答案
  useEffect(() => {
    if (!started || !question || correctAnswers) return;
    if (timer <= 0) {
      requests.get(`/play/${playerId}/answer`).then(res => setCorrectAnswers(res.answers));
    } else {
      const id = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [timer, question, correctAnswers, started]);

  const submitAnswers = async (vals) => {
    try {
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