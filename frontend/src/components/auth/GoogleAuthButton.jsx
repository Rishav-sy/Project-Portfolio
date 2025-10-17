import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GoogleAuthButton = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential
      });
      
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Google auth error:', error);
      alert(error.response?.data?.error || 'Google authentication failed');
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => alert('Google Sign-In failed')}
      useOneTap
    />
  );
};

export default GoogleAuthButton;
