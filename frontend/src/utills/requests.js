import { message } from 'antd';
import config from '../../backend.config.json';

const BASE_HOST = `http://localhost:${config.BACKEND_PORT}`;

const defaultOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

// Encapsulate fetch; BASE_HOST must not be removed or errors will occur
function get(url) {
  // Return Promise
  return (
    fetch(`${BASE_HOST}${url}`, {
      ...defaultOptions,
      headers: {
        ...defaultOptions.headers,
        // Retrieve token from localStorage
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
    })
    // Parse JSON
      .then(res => res.json())
    // Return parsed data
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      })
    // Catch errors, display an error message, and rethrow for upper-level handlers
      .catch(err => { message.error(err.message); throw err; })
  );
}  

/**
* Encapsulate POST function
* @param {*} url
* @param {*} data Data to be sent, an object
* @returns
*/
function post(url, data) {
  return (
    fetch(`${BASE_HOST}${url}`, {
      ...defaultOptions,
      method: 'POST',
      headers: {
        ...defaultOptions.headers,
        // Retrieve token from localStorage
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    })
    // Parse JSON
      .then(res => res.json())
    // Return parsed data
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      })
    // Catch errors, display an error message, and rethrow for upper-level handlers
      .catch(err => { message.error(err.message); throw err; })
  );
}

/**
 * Encapsulate PUT function
 * @param {*} url
 * @param {*} data Data to be sent, an object
 * @returns
 */
function put (url, data) {
  return (
    fetch(`${BASE_HOST}${url}`, {
      ...defaultOptions,
      method: 'PUT',
      headers: {
        ...defaultOptions.headers,
        // Retrieve token from localStorage
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    })
    // Parse JSON
      .then(res => res.json())
    // Return parsed data
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      })
    // Catch errors, display an error message, and rethrow for upper-level handlers
      .catch(err => { message.error(err.message); throw err; })
  );
}

const requests = {
  get,
  post,
  put,
};

export default requests;