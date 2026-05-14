import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

const GroupScreen: React.FC = () => {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Group</Text>
      <Text style={styles.sub}>Group view placeholder</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sub: { color: Colors.textSecondary, marginTop: 8 },
});

export default GroupScreen;
