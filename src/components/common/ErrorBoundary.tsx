import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { FontSizes, FontWeight, Radius } from '../../theme/tokens';

interface Props {
  children: ReactNode;

  screenName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    // Log for debugging — replace with crash-reporting SDK (e.g. Sentry) if needed
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      const screen = this.props.screenName ?? 'Screen';
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>{screen} failed to load</Text>
          <Text style={styles.message} numberOfLines={4}>
            {this.state.errorMessage}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={this.handleRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  btnText: {
    color: Colors.white,
    fontWeight: FontWeight.bold as any,
    fontSize: FontSizes.base,
  },
});

export default ErrorBoundary;
