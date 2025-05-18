import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import config from '../../../backend.config.json';
import './Join.css';

const BASE_URL = `http://localhost:${config.BACKEND_PORT}`;

export default function Join() {
  const { sessionId: paramSessionId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleJoin = async (values) => {
    const { sessionId, name } = values;
    if (!sessionId || !name) {
      message.error("Session ID and name are required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/play/join/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Navigate to game page after successful join
      navigate(`/play/${data.playerId}`);
    } catch (error) {
      message.error(error.message || "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="joinContainer">
      <Card 
        title="Join Game Session" 
        className="joinCard"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sessionId: paramSessionId }}
          onFinish={handleJoin}
        >
          <Form.Item
            name="sessionId"
            label="Session ID"
            rules={[{ required: true, message: "Please enter session ID" }]}
          >
            <Input 
              placeholder="Enter session ID"
              disabled={!!paramSessionId}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Your Name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input 
              placeholder="Enter your name"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              Join Game
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
