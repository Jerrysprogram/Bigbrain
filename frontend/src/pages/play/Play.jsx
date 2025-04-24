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

  // 轮询状态 & 问题/答案
  useEffect(() => {
    let interval;
    async function poll() {
      try {
        const res = await requests.get(`/play/${playerId}/status`);
        setStatus(res);
        if (!res.started && question === null) {
          setLoading(false);
          // waiting to start
        } else if (res.started && question === null) {
          // fetch question
          const qres = await requests.get(`/play/${playerId}/question`);
          const q = qres.question;
          setQuestion(q);
          setAnswers([]);
          setCorrectAnswers(null);
          // set timer
          const elapsed = (Date.now() - new Date(q.isoTimeLastQuestionStarted).getTime()) / 1000;
          setTimer(Math.max(q.duration - elapsed, 0));
        } else if (res.answerAvailable && correctAnswers === null) {
          // fetch correct answers
          const answerRes = await requests.get(`/play/${playerId}/answer`);
          setCorrectAnswers(answerRes.answers);
        } else if (!res.started && question !== null && results === null) {
          // final results
          const rres = await requests.get(`/play/${playerId}/results`);
          setResults(rres);
        }
      } catch (err) {
        // ignore polling errors
      }
    }
    interval = setInterval(poll, 1000);
    poll();
    return () => clearInterval(interval);
  }, [playerId, question, correctAnswers]);

  // 倒计时 effect，基于当前问题状态更新 timer
  useEffect(() => {
    let intervalId;
    if (status && status.started && question && correctAnswers === null) {
      intervalId = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [status, question, correctAnswers]);

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
      const options = type === 'judgement' ? ['True', 'False'] : question.answers;
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
          options={question.answers.map(ans => ({ label: ans, value: ans }))}
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