// import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, message, Typography } from "antd";
import requests from "../../utills/requests";

const { Title } = Typography;

// Login page component
export default function Login() {
  // Initialize navigation
  const navigate = useNavigate();
  const onFinish = (values) => {
    console.log("Received values of form: ", values);
    const { email, password } = values;
    // Send login request
    requests.post("/admin/auth/login", { email, password }).then((res) => {
      if (res && res.token) {
        // Save token and show success message
        localStorage.setItem("token", res.token);
        localStorage.setItem("email", values.email);
        message.success("Login successful!");
        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        // Show error message on login failure
        message.error("Invalid email or password");
      }
    });
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        padding: "0 16px",
      }}
    >
      <div style={{ width: 360 }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 24 }}>
          Login
        </Title>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: "Please input your Email!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <a href="">Forgot password</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button block type="primary" htmlType="submit">
              Log in
            </Button>
            or <Link to="/register">Register now!</Link>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
