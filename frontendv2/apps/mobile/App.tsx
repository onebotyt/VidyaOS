import React, { useEffect } from 'react';
import { App } from '@vidyaos/app';
import { api } from '@vidyaos/core';

export default function MobileApp() {
  useEffect(() => {
    api.setBaseUrl('https://vidyaos-backend.onrender.com');
  }, []);

  return <App />;
}
