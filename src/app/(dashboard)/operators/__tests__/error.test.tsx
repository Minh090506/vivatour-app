/**
 * Tests for operators list error boundary
 * Covers: error catching, Vietnamese messages, retry button
 */

import { render, screen, fireEvent } from '@testing-library/react';
import OperatorsError from '../error';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('OperatorsError', () => {
  const mockReset = jest.fn();
  const mockError = new Error('Test error message') as Error & { digest?: string };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Error Boundary Behavior', () => {
    it('renders error fallback UI when error is caught', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải danh sách điều hành')).toBeInTheDocument();
      expect(
        screen.getByText('Không thể tải danh sách dịch vụ điều hành. Vui lòng thử lại sau.')
      ).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[OperatorsError]', mockError);
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays user-friendly Vietnamese error title', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải danh sách điều hành')).toBeInTheDocument();
    });

    it('displays user-friendly Vietnamese error message', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText('Không thể tải danh sách dịch vụ điều hành. Vui lòng thử lại sau.')
      ).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /tải lại/i })).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('renders retry button', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /tải lại/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls reset function when retry button is clicked', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /tải lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Display', () => {
    it('renders error card with danger styling', () => {
      render(<OperatorsError error={mockError} reset={mockReset} />);

      const errorIcon = document.querySelector('.bg-danger-100');
      expect(errorIcon).toBeInTheDocument();
    });

    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'xyz789';

      render(<OperatorsError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[OperatorsError]', errorWithDigest);
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const { container } = render(<OperatorsError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });

    it('has proper padding', () => {
      const { container } = render(<OperatorsError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-6');
    });
  });
});
