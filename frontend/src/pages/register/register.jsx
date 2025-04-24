import React from 'react';
import { Button, Form, Input, message, Typography } from 'antd';
import requests from '../../utills/requests';
import { useNavigate, Link } from 'react-router-dom';

const { Title } = Typography;

// Register page component
const Register = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = values => {
    const { password, name, email, confirm } = values;
    if (password !== confirm) {
      message.error('Passwords do not match!');
      return;
    }
    requests.post('/admin/auth/register', { email, password, name })
      .then(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('email', email);
        message.success('Register successful!');
        navigate('/dashboard');
      })
      .catch(err => {
        message.error(`Registration failed: ${err.message}`);
      });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '0 16px' }}>
      <div style={{ width: 600 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>Register</Title>
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="E-mail"
            rules={[
              { type: 'email', message: 'The input is not valid E-mail!' },
              { required: true, message: 'Please input your E-mail!' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input your name!', whitespace: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password!' }]}
            hasFeedback
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={[ 'password' ]}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The new password that you entered do not match!'));
                }
              })
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button block type="primary" htmlType="submit">
              Register
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            or <Link to="/login">Login</Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Register;