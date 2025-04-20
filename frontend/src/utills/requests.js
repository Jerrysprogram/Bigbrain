import { message } from 'antd';

const BASE_HOST = 'http://localhost:5005';

const defaultOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

// 封装 fetch
function get (url) {
}

//**
 * 封装 post 函数
 * @param {*} url
 * @param {*} data 传输的数据, 对象
 * @returns
 */
function post (url, data) {
  return (
    fetch(`${BASE_HOST}${url}`, {
      ...defaultOptions,
      method: 'POST',
      headers: {
        ...defaultOptions.headers,
        // 从 localStorage 中获取 token
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
