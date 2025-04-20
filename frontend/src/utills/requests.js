import { message } from 'antd';

const BASE_HOST = 'http://localhost:5005';

const defaultOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

// 封装 fetch   不删${BASE_HOST}会报错
function get(url) {
    // Return Promise
    return (
      fetch(`${BASE_HOST}${url}`, {
        ...defaultOptions,
        headers: {
          ...defaultOptions.headers,
          // 从 localStorage 中获取 token
          Authorization: `Bearer ${window.localStorage.getItem('token')}`,
        },
      })
        // 解析 json
        .then(res => res.json())
        // 返回解析过的数据
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          return data;
        })
        // 捕获到错误，显示错误消息
        .catch(err => message.error(err.message))
    );
  }  

/**
* 封装 post 函数
* @param {*} url 
* @param {*} data 传输的数据，对象
* @returns 
*/
function post(url, data) {
 return (
   fetch(`${BASE_HOST}${url}`, {
     ...defaultOptions,
     method: 'POST',
     headers: {
       ...defaultOptions.headers,
       // 从 localStorage 中获取 token
       Authorization: `Bearer ${window.localStorage.getItem('token')}`,
     },
     body: JSON.stringify(data),
   })
     // 解析 json
     .then(res => res.json())
     // 返回解析过的数据
     .then(data => {
       if (data.error) {
         throw new Error(data.error);
       }
       return data;
     })
     // 捕获到错误，显示错误消息
     .catch(err => message.error(err.message))
 );
}

/**
 * 封装 put 函数
 * @param {*} url
 * @param {*} data 传输的数据，对象
 * @returns
 */
function put (url, data) {
    return (
      fetch(`${BASE_HOST}${url}`, {
        ...defaultOptions,
        method: 'PUT',
        headers: {
          ...defaultOptions.headers,
          // 从 localStorage 中获取 token
          Authorization: `Bearer ${window.localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      })
        // 解析 json
        .then(res => res.json())
        // 返回解析过的数据
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          return data;
        })
        // 捕获到错误，显示错误消息
        .catch(err => message.error(err.message))
    );
  }

const requests = {
  get,
  post,
  put,
};

export default requests;