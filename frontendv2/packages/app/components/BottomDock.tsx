import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Icon, type IconName } from './Icons';

interface BottomDockProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: IconName;
}

export const BottomDock: React.FC<BottomDockProps> = ({ currentRoute, onNavigate }) => {
  const tabs: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'classes', label: 'Classes', icon: 'classes' },
    { key: 'routine', label: 'Routine', icon: 'routine' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <View style={styles.dock}>
      {tabs.map(tab => {
        const isActive = currentRoute === tab.key;
        const color = isActive ? '#2563eb' : '#64748b';

        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onNavigate(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon name={tab.icon} size={20} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  dock: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    ...(Platform.OS === 'web' ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 } : {}),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrap: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: '#eff6ff',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default BottomDock;
