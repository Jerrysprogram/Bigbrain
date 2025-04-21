import React from 'react';
import { Button, Form, Input, message } from 'antd';
import requests from '../../utills/requests';
import { useNavigate } from 'react-router-dom';

// 注册页面组件
const Register = () => {
  // 初始化路由导航
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const onFinish = values => {
    console.log('Received values of form: ', values);
    const { password, name, email, confirm } = values;
    if (password !== confirm) {
      message.error('两次输入的密码不一致!');
      return;
    }
    const data = {
      email,
      password,
      name
    };
    // 发起注册请求
    requests.post('/admin/auth/register', data)
      .then(res => {
        // 保存token并提示
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', values.email);
        message.success('Register successfully!');
        // 跳转到dashboard页面
        navigate('/dashboard');
      });
  };
  return (
    <Form
      form={form}
      name="register"
      onFinish={onFinish}
      style={{ maxWidth: 600 }}
      requiredMark={false}
    >
      <Form.Item
        name="email"
        label="E-mail"
        rules={[
          {
            type: 'email',
            message: 'The input is not valid E-mail!',
          },
          {
            required: true,
            message: 'Please input your E-mail!',
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="name"
        label="name"
        rules={[{ required: true, message: 'Please input your name!', whitespace: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[
          {
            required: true,
            message: 'Please input your password!',
          },
        ]}
        hasFeedback
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name="confirm"
        label="Confirm Password"
        dependencies={['password']}
        hasFeedback
        rules={[
          {
            required: true,
            message: 'Please confirm your password!',
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('The new password that you entered do not match!'));
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>


      <Form.Item>
        <Button type="primary" htmlType="submit">
          Register
        </Button>
      </Form.Item>
    </Form>
  );
};

export default Register;