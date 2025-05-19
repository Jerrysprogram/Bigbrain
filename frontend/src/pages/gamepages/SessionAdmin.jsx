import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  message,
  Spin,
  Table,
  Space,
  Card,
  Typography,
  Row,
  Col,
} from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import requests from "../../utills/requests";

const { Title } = Typography;

export default function SessionAdmin() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);

  //initialize game id
  useEffect(() => {
    async function init() {
      try {
        const { games } = await requests.get("/admin/games");
        const g = games.find(
          (g) =>
            g.active === +sessionId ||
            (g.oldSessions || []).includes(+sessionId),
        );
        if (!g) throw new Error("Game for this session not found");
        setGameId(g.id);
      } catch (err) {
        message.error(`Initialize failed: ${err.message}`);
      }
    }
    init();
  }, [sessionId]);

  // fetch session status
  const fetchStatus = async () => {
    try {
      const { results: s } = await requests.get(
        `/admin/session/${sessionId}/status`,
      );
      setStatus(s);
      // initialize/update timer
      if (s.active) {
        const elapsed =
          (Date.now() - new Date(s.isoTimeLastQuestionStarted).getTime()) /
          1000;
        const duration = s.questions[s.position]?.duration || 0;
        setTimer(Math.max(duration - elapsed, 0));
      } else {
        setTimer(0);
      }
      return s;
    } catch (err) {
      message.error(`Fetch status failed: ${err.message}`);
    }
  };

  // fetch results
  const fetchResults = async () => {
    try {
      const data = await requests.get(`/admin/session/${sessionId}/results`);
      // API may return plain array or object with results property
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      message.error(`Fetch results failed: ${err.message}`);
    }
  };

  // initialize fetch status
  useEffect(() => {
    async function load() {
      setLoading(true);
      const s = await fetchStatus();
      if (s && !s.active) {
        await fetchResults();
      }
      setLoading(false);
    }
    if (gameId) load();
  }, [gameId]);

  // advance to next question
  const handleAdvance = async () => {
    try {
      await requests.post(`/admin/game/${gameId}/mutate`, {
        mutationType: "ADVANCE",
      });
      const s = await fetchStatus();
      if (s && !s.active) await fetchResults();
    } catch (err) {
      message.error(`Advance failed: ${err.message}`);
    }
  };

  // stop session
  const handleStop = async () => {
    try {
      await requests.post(`/admin/game/${gameId}/mutate`, {
        mutationType: "END",
      });
      message.success("Session stopped");
      const s = await fetchStatus();
      if (s && !s.active) await fetchResults();
    } catch (err) {
      message.error(`Stop failed: ${err.message}`);
    }
  };

  // timer effect: decrease timer every second when session is active
  useEffect(() => {
    let timerId;
    if (status && status.active) {
      timerId = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [status]);

  if (loading || !status) {
    return <Spin tip="Loading session..." />;
  }

  // active session interface
  if (status.active) {
    const total = status.questions.length;
    const pos = status.position;
    // calculate remaining seconds
    const remaining = timer;
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2>Game Session: {sessionId}</h2>
          <div>
            <Button
              onClick={() => {
                fetchStatus().then((s) => {
                  if (!s.active) fetchResults();
                });
              }}
              style={{ marginRight: 8 }}
            >
              Refresh
            </Button>
            <Button onClick={() => navigate("/dashboard")} type="primary">
              Back to Dashboard
            </Button>
          </div>
        </div>
        <Card size="small" style={{ marginBottom: 16 }}>
          <p>
            <strong>Game in progress</strong>
          </p>
          <p>
            Current question: {status.questions[pos]?.text || ""} ({pos + 1}/{total})
          </p>
          <p>Answer countdown: {Math.round(remaining)} seconds</p>
          <p>Online players: {status.players.length}</p>
        </Card>
        <Space>
          <Button
            type="primary"
            onClick={handleAdvance}
            disabled={status.players.length === 0}
          >
            Next question
          </Button>
          <Button danger onClick={handleStop}>
            End session
          </Button>
        </Space>
      </div>
    );
  }

  // session ended, show detailed player scores
  const safeResults = Array.isArray(results) ? results : [];

  // 生成每位玩家的各题得分、总分和正确率
  const playerResults = safeResults.map((p) => {
    const perScores = p.answers.map((ans, idx) =>
      ans.correct ? status.questions[idx].points || 0 : 0
    );
    const totalScore = perScores.reduce((sum, val) => sum + val, 0);
    const correctCount = perScores.filter((v) => v > 0).length;
    const accuracyRate =
      status.questions.length > 0
        ? ((correctCount / status.questions.length) * 100).toFixed(1)
        : '0.0';
    const row = { name: p.name, totalScore, accuracyRate };
    perScores.forEach((score, idx) => {
      row[`Q${idx + 1}`] = score;
    });
    return row;
  });

  // 取前五名
  const tableData = playerResults
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  // 转置表格：展示单一玩家，题目为行，分数列，并在底部显示总分和正确率
  const firstPlayer = tableData[0] || {};
  const transposedColumns = [
    { title: 'Question', dataIndex: 'question', key: 'question' },
    { title: 'Score', dataIndex: 'score', key: 'score' },
  ];
  const transposedData = status.questions.map((q, idx) => {
    const correctOption = Array.isArray(q.correctAnswers)
      ? q.correctAnswers.join(', ')
      : q.correctAnswers;
    return {
      question: `Question ${idx + 1} (Correct: ${correctOption})`,
      score: firstPlayer[`Q${idx + 1}`] || 0,
    };
  });
  // Bottom rows: total score and accuracy
  transposedData.push({ question: 'Total Score', score: firstPlayer.totalScore || 0 });
  transposedData.push({ question: 'Accuracy (%)', score: firstPlayer.accuracyRate || '0.0' });

  // 恢复平均答题时间数据
  const avgTimeData = (status.questions || []).map((q, idx) => {
    const times = safeResults
      .map((p) => {
        const ans = p.answers[idx];
        if (ans?.questionStartedAt && ans?.answeredAt) {
          return (
            (new Date(ans.answeredAt).getTime() -
              new Date(ans.questionStartedAt).getTime()) /
            1000
          );
        }
        return null;
      })
      .filter((t) => t != null);
    const avgTime =
      times.length > 0
        ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
        : 0;
    return { question: `Q${idx + 1}`, avgTime: Number(avgTime) };
  });

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Results for {firstPlayer.name} (Session ID: {sessionId})</Title>
      <Button
        type="primary"
        style={{ marginBottom: 16 }}
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </Button>
      <Table
        dataSource={transposedData}
        columns={transposedColumns}
        rowKey="question"
        pagination={false}
      />
      {/* Charts below table */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Average Response Time (s)">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={avgTimeData}
                  margin={{ top: 20, right: 20, left: 60, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" label={{ value: 'Question Number', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Average Response Time (s)', angle: -90, position: 'outsideLeft', offset: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avgTime"
                    name="Avg Time"
                    stroke="#52c41a"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
