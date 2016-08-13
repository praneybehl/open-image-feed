import fetch from 'isomorphic-fetch';
import { browserHistory } from 'react-router';
import { checkStatus } from '../../utils/http';
import { API_URL } from '../../utils/config.js';

export const REQUEST_LOGIN  = 'REQUEST_LOGIN';
export const SUCCESS_LOGIN  = 'SUCCESS_LOGIN';
export const ERROR_LOGIN    = 'ERROR_LOGIN';

function requestLogin() {
  return {
    type : REQUEST_LOGIN
  };
}

function successLogin(user) {
  return {
    type    : SUCCESS_LOGIN,
    message : 'You are now logged in',
    user
  };
}

function errorLogin() {
  return {
    type    : ERROR_LOGIN,
    message : 'Invalid credentials'
  };
}

function doLogin(user) {
  return dispatch => {
    dispatch(requestLogin());
    return fetch(`${API_URL}/users/login`, {
      method  : 'POST',
      headers : {
        Accept         : 'application/json',
        'Content-Type' : 'application/json'
      },
      body    : JSON.stringify(user)
    })
    .then(checkStatus)
    .then(() => {
      // Generate authHeader / It will be save in state & localStorage
      user.authHeader = `Basic ${btoa(`${user.username}:${user.password}`)}`;
    })
    .then(() => dispatch(successLogin(user)))
    .then(() => browserHistory.push('/'))
    .catch(() => dispatch(errorLogin()));
  };
}

// Avoid making several login requests
function shouldLogin(state) {
  const user = state.user;
  if (!user) {
    return true;
  }
  if (user.isFetching) {
    return false;
  }
  return true;
}

export function login(user) {
  return (dispatch, getState) => {
    if (shouldLogin(getState())) {
      return dispatch(doLogin(user));
    }
    return Promise.resolve();
  };
}
