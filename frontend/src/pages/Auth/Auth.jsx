import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginForm from '../../components/auth/LoginForm';
import SignupForm from '../../components/auth/SignupForm';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-header">
          <h1 className="auth-title">Stock Portfolio Tracker</h1>
          <p className="auth-subtitle">Track your investments, grow your wealth</p>
        </div>

        {isLogin ? (
          <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
        ) : (
          <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="google-auth-wrapper">
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <GoogleAuthButton />
          </GoogleOAuthProvider>
        </div>
      </div>
    </div>
  );
};

export default Auth;
