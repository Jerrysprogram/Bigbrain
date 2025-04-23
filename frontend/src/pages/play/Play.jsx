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

