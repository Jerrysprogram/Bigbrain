import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Button, Radio, Checkbox, List, Typography, Progress, message } from 'antd';
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
    return <Alert message="Please wait for the host to start the game" type="info" />;
  }

  // final results
  if (!status.started && results) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>Your Results</Title>
        <List
          dataSource={results}
          renderItem={(ans, idx) => (
            <List.Item>
              <Paragraph>
                Question {idx + 1}: {ans.answers || ''}
                {' '}| Correct: {ans.correct ? 'Yes' : 'No'}
                {' '}| Time: {Math.round((new Date(ans.answeredAt) - new Date(ans.questionStartedAt)) / 1000)}s
              </Paragraph>
            </List.Item>
          )}
        />
      </div>
    );
  }

  // question ongoing
  if (status.started && question && correctAnswers === null) {
    // countdown
    useEffect(() => {
      const t = setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
      return () => clearInterval(t);
    }, []);
    const type = question.type;
    let inputComponent;
    if (type === 'single' || type === 'judgement') {
      const options = type === 'judgement' ? ['True', 'False'] : question.answers.map((_, i) => i);
      inputComponent = (
        <Radio.Group onChange={e => submitAnswers([e.target.value])} value={answers[0]}>
          {options.map(opt => (
            <Radio key={opt} value={opt}>{opt.toString()}</Radio>
          ))}
        </Radio.Group>
      );
    } else {
      inputComponent = (
        <Checkbox.Group options={question.answers.map((_,i)=>({ label: i, value:i }))} value={answers} onChange={submitAnswers} />
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