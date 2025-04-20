import React from 'react';
import { Link } from 'react-router-dom';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input } from 'antd';

// 登录页面组件
export default function Login() {
  const onFinish = values => {
    console.log('Received values of form: ', values);
  };
  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      style={{ maxWidth: 360 }}
      onFinish={onFinish}
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Please input your Username!' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your Password!' }]}
      >
        <Input prefix={<LockOutlined />} type="password" placeholder="Password" />
      </Form.Item>
      <Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  );
}