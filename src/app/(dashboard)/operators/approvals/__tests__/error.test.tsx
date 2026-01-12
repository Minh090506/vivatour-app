/**
 * Tests for approvals error boundary
 * Covers: error catching, Vietnamese messages, retry/back buttons
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalsError from '../error';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('ApprovalsError', () => {
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
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải danh sách duyệt')).toBeInTheDocument();
      expect(
        screen.getByText('Không thể tải danh sách chờ duyệt thanh toán. Vui lòng thử lại hoặc quay lại.')
      ).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[ApprovalsError]', mockError);
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays user-friendly Vietnamese error title', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải danh sách duyệt')).toBeInTheDocument();
    });

    it('displays user-friendly Vietnamese error message', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText('Không thể tải danh sách chờ duyệt thanh toán. Vui lòng thử lại hoặc quay lại.')
      ).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });

    it('displays Vietnamese back button label', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /quay lại/i })).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('renders retry button', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls reset function when retry button is clicked', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Back Navigation', () => {
    it('renders back button', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /quay lại/i })).toBeInTheDocument();
    });

    it('navigates to /operators when back button is clicked', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      const backButton = screen.getByRole('button', { name: /quay lại/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/operators');
    });
  });

  describe('Error Display', () => {
    it('renders error card with danger styling', () => {
      render(<ApprovalsError error={mockError} reset={mockReset} />);

      const errorIcon = document.querySelector('.bg-danger-100');
      expect(errorIcon).toBeInTheDocument();
    });

    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'approvals-abc123';

      render(<ApprovalsError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[ApprovalsError]', errorWithDigest);
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const { container } = render(<ApprovalsError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });

    it('has proper padding', () => {
      const { container } = render(<ApprovalsError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-6');
    });
  });
});
