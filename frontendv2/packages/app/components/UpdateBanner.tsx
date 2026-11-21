import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { checkUniversalAppUpdate, type AppReleaseInfo } from '@vidyaos/core';

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for updates 2 seconds after app launch so UI renders immediately
    const timer = setTimeout(() => {
      checkUniversalAppUpdate()
        .then(info => {
          if (info && info.hasUpdate) {
            setUpdateInfo(info);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!updateInfo || !updateInfo.hasUpdate || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    const url = Platform.OS === 'web' 
      ? 'https://github.com/onebotyt/VidyaOS/releases/latest' 
      : updateInfo.v2ApkUrl;

    Linking.openURL(url).catch(() => {
      Linking.openURL('https://github.com/onebotyt/VidyaOS/releases');
    });
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.banner}>
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 20 }}>🚀</Text>
        </View>

        <View style={styles.textBox}>
          <Text style={styles.title}>Update Available • v{updateInfo.latestVersion}</Text>
          <Text style={styles.desc} numberOfLines={2}>
            {updateInfo.releaseNotes || 'A new version of VidyaOS is available with new features and improvements.'}
          </Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.updateBtn} onPress={handleUpdate}>
              <Text style={styles.updateBtnText}>Update Now →</Text>
            </Pressable>

            <Pressable style={styles.laterBtn} onPress={() => setDismissed(true)}>
              <Text style={styles.laterBtnText}>Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  updateBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  updateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  laterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  laterBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UpdateBanner;
