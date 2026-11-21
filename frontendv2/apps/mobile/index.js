import { registerRootComponent } from 'expo';
import { api } from '@vidyaos/core';
import App from './App';

// Explicitly ensure API points to production cloud backend for native mobile
api.setBaseUrl('https://vidyaos-backend.onrender.com');

registerRootComponent(App);
