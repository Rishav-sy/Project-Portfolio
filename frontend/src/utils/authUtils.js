const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const authUtils = {
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('Token saved:', token);
  },
  
  getToken: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('Token retrieved:', token);
    return token;
  },
  
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    console.log('User saved:', user);
  },
  
  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  
  removeUser: () => localStorage.removeItem(USER_KEY),
  
  isAuthenticated: () => {
    const hasToken = !!localStorage.getItem(TOKEN_KEY);
    console.log('Is authenticated:', hasToken);
    return hasToken;
  },
  
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    console.log('Logged out');
  }
};

export default authUtils;
