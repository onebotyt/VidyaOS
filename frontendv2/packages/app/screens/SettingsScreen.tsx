import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Platform, Linking, ActivityIndicator } from 'react-native';
import { authStore, type User, checkUniversalAppUpdate, CURRENT_APP_VERSION, type AppReleaseInfo } from '@vidyaos/core';

interface SettingsScreenProps {
  onNavigate: (route: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(authStore.getState().user);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<AppReleaseInfo | null>(null);
  const [updateChecked, setUpdateChecked] = useState(false);

  useEffect(() => {
    return authStore.subscribe(state => setUser(state.user));
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateChecked(false);
    try {
      const res = await checkUniversalAppUpdate();
      setUpdateResult(res);
      setUpdateChecked(true);
    } catch (_) {
      setUpdateChecked(true);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    authStore.logout();
    setLogoutModalVisible(false);
    onNavigate('login');
  };

  const name = user?.full_name || 'Girdhar Dhami';
  const email = user?.email || 'student@ugip.ac.in';
  const dept = user?.department_name || 'Information Technology';
  const isGoogleLinked = Boolean(user?.google_linked);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings & Preferences</Text>
      <Text style={styles.pageSubtitle}>Manage your account, Google 1-Click sign-in, and preferences.</Text>

      {/* 1. Profile Identity Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileDept}>{dept} • Sem 5</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
      </View>

      {/* 2. Google 1-Click Sign-In Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AUTHENTICATION & SECURITY</Text>
        <View style={styles.cardGroup}>
          <View style={styles.itemRow}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 18 }}>🔐</Text>
            </View>
            <View style={styles.itemTextWrap}>
              <View style={styles.itemHeadingRow}>
                <Text style={styles.itemTitle}>Google 1-Click Sign-In</Text>
                <View style={[styles.statusBadge, isGoogleLinked ? styles.badgeOk : styles.badgeWarn]}>
                  <Text style={[styles.statusBadgeText, isGoogleLinked ? styles.textOk : styles.textWarn]}>
                    {isGoogleLinked ? 'Connected' : 'Not Linked'}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                {isGoogleLinked 
                  ? 'Your Google account is linked for instant 1-tap sign in.' 
                  : 'Link Google for instant 1-click passwordless sign-in.'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. App & Platform Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APP & UPDATES</Text>
        <View style={styles.cardGroup}>
          <View style={styles.itemRow}>
            <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
              <Text style={{ fontSize: 18 }}>📱</Text>
            </View>
            <View style={styles.itemTextWrap}>
              <View style={styles.itemHeadingRow}>
                <Text style={styles.itemTitle}>Universal React v2.0</Text>
                <View style={[styles.statusBadge, styles.badgeOk]}>
                  <Text style={[styles.statusBadgeText, styles.textOk]}>Platform: {Platform.OS.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>Single universal React codebase for Web, Native Mobile & Tauri PC.</Text>
            </View>
          </View>

          {/* GitHub Live Updater */}
          <View style={[styles.itemRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
            </View>
            <View style={styles.itemTextWrap}>
              <View style={styles.itemHeadingRow}>
                <Text style={styles.itemTitle}>Release Version</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#475569' }]}>v{CURRENT_APP_VERSION}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                {updateResult?.hasUpdate
                  ? `Update Available: v${updateResult.latestVersion}`
                  : updateChecked
                  ? `You are running the latest version (v${CURRENT_APP_VERSION}).`
                  : 'Check GitHub releases for latest builds & features.'}
              </Text>

              <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                {updateResult?.hasUpdate ? (
                  <Pressable
                    style={[styles.linkBtn, { backgroundColor: '#16a34a' }]}
                    onPress={() => {
                      const url = Platform.OS === 'web'
                        ? 'https://github.com/onebotyt/VidyaOS/releases/latest'
                        : updateResult.v2ApkUrl;
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={[styles.linkBtnText, { color: '#ffffff' }]}>
                      Install v{updateResult.latestVersion} →
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.linkBtn, { opacity: checkingUpdate ? 0.7 : 1 }]}
                    onPress={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    {checkingUpdate ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Text style={styles.linkBtnText}>
                        {updateChecked ? '✓ Checked Just Now' : 'Check for Updates'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Sign Out Button */}
      <View style={styles.section}>
        <Pressable 
          style={styles.logoutBtn} 
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={styles.logoutBtnText}>Sign Out of VidyaOS</Text>
        </Pressable>
      </View>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalDesc}>Are you sure you want to end your active session on this device?</Text>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.cancelBtn} 
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={styles.dangerBtn} 
                onPress={handleLogout}
              >
                <Text style={styles.dangerBtnText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileDept: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 2,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeOk: {
    backgroundColor: '#dcfce7',
  },
  textOk: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeWarn: {
    backgroundColor: '#fef3c7',
  },
  textWarn: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 36,
    marginBottom: 8,
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
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
  dangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default SettingsScreen;
