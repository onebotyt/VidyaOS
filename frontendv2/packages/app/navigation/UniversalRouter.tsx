import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { authStore } from '@vidyaos/core';
import { Header } from '../components/Header';
import { BottomDock } from '../components/BottomDock';
import { UpdateBanner } from '../components/UpdateBanner';

import { HomeScreen } from '../screens/HomeScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { RoutineScreen } from '../screens/RoutineScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';

export const UniversalRouter: React.FC = () => {
  const [route, setRoute] = useState<string>('home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authStore.getState().isAuthenticated);

  useEffect(() => {
    return authStore.subscribe(state => {
      setIsAuthenticated(state.isAuthenticated);
      if (!state.isAuthenticated) {
        setRoute('login');
      }
    });
  }, []);

  // Web Hash routing synchronization
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleHashChange = () => {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        if (hash) setRoute(hash);
      };

      window.addEventListener('hashchange', handleHashChange);
      handleHashChange();

      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const navigate = (newRoute: string) => {
    setRoute(newRoute);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.hash = `#${newRoute}`;
    }
  };

  // Auth Guard
  if (!isAuthenticated || route === 'login') {
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen onSuccess={() => navigate('home')} />
        <UpdateBanner />
      </View>
    );
  }

  const renderActiveScreen = () => {
    switch (route) {
      case 'home':
        return <HomeScreen onNavigate={navigate} />;
      case 'classes':
        return <ClassesScreen onNavigate={navigate} />;
      case 'routine':
        return <RoutineScreen />;
      case 'settings':
        return <SettingsScreen onNavigate={navigate} />;
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  const getPageTitle = () => {
    switch (route) {
      case 'home': return 'Home';
      case 'classes': return 'Classes';
      case 'routine': return 'Routine';
      case 'settings': return 'Settings';
      default: return 'VidyaOS';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {/* Top Header */}
        <Header 
          title={getPageTitle()} 
          onNavigate={navigate} 
          currentRoute={route}
        />

        {/* Main Viewport */}
        <View style={styles.viewport}>
          {renderActiveScreen()}
        </View>

        {/* Bottom Navigation Dock */}
        <BottomDock 
          currentRoute={route} 
          onNavigate={navigate} 
        />

        {/* Global In-App Update Prompt */}
        <UpdateBanner />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appShell: {
    flex: 1,
    backgroundColor: '#f8fafc',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  viewport: {
    flex: 1,
  },
});

export default UniversalRouter;
