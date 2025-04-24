import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Card } from "antd";
import requests from "../../utills/requests";

export default function Join() {
  const { sessionId: paramSessionId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [sessionId, setSessionId] = useState(paramSessionId || "");

  useEffect(() => {
    form.setFieldsValue({ sessionId, name: "" });
  }, [sessionId]);

  const handleSubmit = async (values) => {
    const sid = values.sessionId;
    const name = values.name;
    if (!sid || !name) {
      message.error("Session ID and name are required");
      return;
    }
    try {
      const res = await requests.post(`/play/join/${sid}`, { name });
      const playerId = res.playerId;
      navigate(`/play/${playerId}`);
    } catch (err) {
      message.error(`Join failed: ${err.message}`);
    }
  };

  return (
    <Card
      title="Join a Game Session"
      style={{ maxWidth: 400, margin: "50px auto" }}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          name="sessionId"
          label="Session ID"
          rules={[{ required: true, message: "Please enter session ID" }]}
        >
          <Input
            placeholder="Enter session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="Your Name"
          rules={[{ required: true, message: "Please enter your name" }]}
        >
          <Input placeholder="Enter your name" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Join
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
