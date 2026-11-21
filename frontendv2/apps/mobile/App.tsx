import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { App } from '@vidyaos/app';
import { api } from '@vidyaos/core';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Unhandled UI Exception caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>VidyaOS v2 Notice</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </Text>
            <ScrollView style={styles.stackBox}>
              <Text style={styles.stackText}>
                {this.state.error?.stack || 'No stack trace available.'}
              </Text>
            </ScrollView>
            <Pressable style={styles.restartBtn} onPress={this.handleRestart}>
              <Text style={styles.restartBtnText}>Reload Interface</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MobileApp() {
  useEffect(() => {
    try {
      api.setBaseUrl('https://vidyaos-backend.onrender.com');
    } catch (_) {}
  }, []);

  return (
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  stackBox: {
    maxHeight: 140,
    width: '100%',
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  stackText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  restartBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  restartBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
