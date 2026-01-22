'use client';

import { Component, type ReactNode } from 'react';
import { ErrorFallback } from '@/components/ui/error-fallback';

interface Props {
  children: ReactNode;
  sectionName: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for individual report sections.
 * Isolates errors to prevent entire dashboard from crashing.
 */
export class ReportSectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={`Lỗi tải ${this.props.sectionName}`}
          message={this.state.error?.message || 'Đã xảy ra lỗi không mong muốn'}
          onRetry={this.handleRetry}
          retryLabel="Thử lại"
        />
      );
    }

    return this.props.children;
  }
}
