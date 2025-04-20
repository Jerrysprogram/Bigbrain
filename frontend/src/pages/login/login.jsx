import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, message } from 'antd';
import requests from '../../utills/requests';

// 登录页面组件
export default function Login() {
  // 初始化路由导航
  const navigate = useNavigate();
  const onFinish = values => {
    console.log('Received values of form: ', values);
    const { email, password } = values;
    // 发起登录请求
    requests.post('/admin/auth/login', { email, password })
      .then(res => {
        if (res && res.token) {
          // 保存token并提示
          localStorage.setItem('token', res.token);
          message.success('Login successful!');
          // 跳转到dashboard页面
          navigate('/dashboard');
        } else {
          // 登录失败时显示错误信息
          message.error('Invalid email or password');
        }
      });
  };
  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      style={{ maxWidth: 360 }}
      onFinish={onFinish}
    >
      <Form.Item
        name="email"
        rules={[{ required: true, message: 'Please input your Email!' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Email" />
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