/**
 * Tests for requests error boundary
 * Covers: error catching, Vietnamese messages, retry button, dev mode error details
 */

import { render, screen, fireEvent } from '@testing-library/react';
import RequestsError from '../error';

// Mock console.error to verify error logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('RequestsError', () => {
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
      render(<RequestsError error={mockError} reset={mockReset} />);

      // Verify error title in Vietnamese
      expect(screen.getByText('Lỗi tải danh sách yêu cầu')).toBeInTheDocument();
      // Verify error message in Vietnamese
      expect(
        screen.getByText('Không thể tải danh sách yêu cầu. Vui lòng thử lại sau.')
      ).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[RequestsError]', mockError);
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays user-friendly Vietnamese error title', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải danh sách yêu cầu')).toBeInTheDocument();
    });

    it('displays user-friendly Vietnamese error message', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText('Không thể tải danh sách yêu cầu. Vui lòng thử lại sau.')
      ).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /tải lại/i })).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('renders retry button', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /tải lại/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls reset function when retry button is clicked', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /tải lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Display', () => {
    it('renders error icon', () => {
      render(<RequestsError error={mockError} reset={mockReset} />);

      // Check for alert icon via SVG presence
      const container = document.querySelector('.bg-danger-100');
      expect(container).toBeInTheDocument();
    });

    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'abc123';

      render(<RequestsError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[RequestsError]', errorWithDigest);
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const { container } = render(<RequestsError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });
  });
});
