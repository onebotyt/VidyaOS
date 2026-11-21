import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { authStore } from '@vidyaos/core';

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password prompt modal for Google 1-Click linking
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleCred, setGoogleCred] = useState('');
  const [linkPassword, setLinkPassword] = useState('');

  const handleCredentialsLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your institutional ID and password');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await authStore.loginWithCredentials(identifier.trim(), password);
      onSuccess();
    } catch (err: any) {
      const msg = err.message || 'Invalid credentials';
      if (msg.toLowerCase().includes('network request failed') || msg.toLowerCase().includes('failed to fetch')) {
        setErrorMsg('Unable to connect to VidyaOS server. Please check your internet connection.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleBtnClick = () => {
    // In web, trigger standard Google GIS popup or redirect
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    } else {
      setErrorMsg('Google Sign-In is initializing. You can also sign in with your ID.');
    }
  };

  const handleLinkPasswordSubmit = async () => {
    if (!linkPassword) {
      setErrorMsg('Please enter your password to authorize linking');
      return;
    }
    setLoading(true);
    try {
      await authStore.loginWithGoogle(googleCred, linkPassword);
      setGooglePromptOpen(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Brand Logo & Title */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={{ fontSize: 22 }}>🎓</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>VidyaOS</Text>
            <Text style={styles.brandSub}>Institutional Academic Suite</Text>
          </View>
        </View>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to access your institutional account</Text>

        {/* 1. Google 1-Click Login Button */}
        <Pressable 
          style={styles.googleBtn} 
          onPress={handleGoogleBtnClick}
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 2. Credentials Form */}
        <Text style={styles.inputLabel}>Institutional Email, Mobile or UBTER Roll No.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2100501001 or email@ugip.ac.in"
          placeholderTextColor="#94a3b8"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable 
            style={styles.eyeBtn}
            onPress={() => setShowPassword(prev => !prev)}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </Pressable>
        </View>

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        <Pressable 
          style={styles.submitBtn} 
          onPress={handleCredentialsLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Sign In →</Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Government Polytechnic Nainital • Secure Academic Portal
        </Text>
      </View>

      {/* MODAL: Link Google Account Password Verification */}
      <Modal
        visible={googlePromptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGooglePromptOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔗</Text>
            <Text style={styles.modalTitle}>Link Google Account</Text>
            <Text style={styles.modalDesc}>
              This Google email matches an existing account. Enter your password once to authorize 1-click login.
            </Text>

            <View style={[styles.passwordContainer, { marginBottom: 16 }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Your current password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={linkPassword}
                onChangeText={setLinkPassword}
              />
              <Pressable 
                style={styles.eyeBtn}
                onPress={() => setShowPassword(prev => !prev)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelBtn} 
                onPress={() => setGooglePromptOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={styles.confirmBtn} 
                onPress={handleLinkPasswordSubmit}
                disabled={loading}
              >
                <Text style={styles.confirmBtnText}>
                  {loading ? 'Verifying...' : 'Link & Sign In'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285f4',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 8,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  eyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 6,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default LoginScreen;
