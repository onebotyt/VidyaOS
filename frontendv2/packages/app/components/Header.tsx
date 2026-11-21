import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { authStore, type User } from '@vidyaos/core';
import { Icon } from './Icons';

interface HeaderProps {
  title?: string;
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'VidyaOS', onNavigate }) => {
  const [user, setUser] = useState<User | null>(authStore.getState().user);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    return authStore.subscribe(state => setUser(state.user));
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  };

  const name = user?.full_name || user?.username || 'Student';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || 'ST';

  return (
    <View style={styles.header}>
      {/* Brand & Page Context */}
      <View style={styles.left}>
        <Pressable 
          style={styles.brandLink}
          onPress={() => onNavigate?.('home')}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>🎓</Text>
          </View>
          <Text style={styles.brandTitle}>VidyaOS</Text>
        </Pressable>
        {title && title !== 'VidyaOS' && (
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>{title.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Right Controls: Theme + Settings + Avatar */}
      <View style={styles.right}>
        <Pressable 
          style={styles.iconBtn} 
          onPress={toggleTheme}
          accessibilityLabel="Toggle Theme"
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={18} color="#64748b" />
        </Pressable>

        <Pressable 
          style={styles.iconBtn} 
          onPress={() => onNavigate?.('settings')}
          accessibilityLabel="Settings"
        >
          <Icon name="settings" size={18} color="#64748b" />
        </Pressable>

        <Pressable 
          style={styles.avatarBtn} 
          onPress={() => onNavigate?.('settings')}
          accessibilityLabel="User Account"
        >
          <Text style={styles.avatarText}>{initials}</Text>
          <View style={styles.onlineDot} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 100 } : {}),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  pageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  pageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

export default Header;
