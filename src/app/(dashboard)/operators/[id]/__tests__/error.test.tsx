/**
 * Tests for operator detail error boundary
 * Covers: error catching, not found handling, Vietnamese messages, retry/back buttons
 */

import { render, screen, fireEvent } from '@testing-library/react';
import OperatorDetailError from '../error';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('OperatorDetailError', () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Generic Error Handling', () => {
    const genericError = new Error('Server error') as Error & { digest?: string };

    it('renders generic error UI for non-not-found errors', () => {
      render(<OperatorDetailError error={genericError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải dịch vụ')).toBeInTheDocument();
      expect(
        screen.getByText('Không thể tải chi tiết dịch vụ. Vui lòng thử lại.')
      ).toBeInTheDocument();
    });

    it('shows retry button for generic errors', () => {
      render(<OperatorDetailError error={genericError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });

    it('calls reset when retry is clicked for generic errors', () => {
      render(<OperatorDetailError error={genericError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('logs error to console', () => {
      render(<OperatorDetailError error={genericError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[OperatorDetailError]', genericError);
    });
  });

  describe('Not Found Error Handling', () => {
    it('detects "not found" in English error message (lowercase)', () => {
      const notFoundError = new Error('Operator not found') as Error & { digest?: string };

      render(<OperatorDetailError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy dịch vụ')).toBeInTheDocument();
      expect(
        screen.getByText('Dịch vụ này không tồn tại hoặc đã bị xóa.')
      ).toBeInTheDocument();
    });

    it('detects "Not Found" in English error message (mixed case)', () => {
      const notFoundError = new Error('Resource Not Found') as Error & { digest?: string };

      render(<OperatorDetailError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy dịch vụ')).toBeInTheDocument();
    });

    it('detects Vietnamese "không tìm thấy" error message', () => {
      const notFoundError = new Error('Không tìm thấy dịch vụ điều hành') as Error & {
        digest?: string;
      };

      render(<OperatorDetailError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy dịch vụ')).toBeInTheDocument();
      expect(
        screen.getByText('Dịch vụ này không tồn tại hoặc đã bị xóa.')
      ).toBeInTheDocument();
    });

    it('does not show retry button for not found errors', () => {
      const notFoundError = new Error('not found') as Error & { digest?: string };

      render(<OperatorDetailError error={notFoundError} reset={mockReset} />);

      expect(screen.queryByRole('button', { name: /thử lại/i })).not.toBeInTheDocument();
    });
  });

  describe('Back Navigation', () => {
    it('renders back button', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /về danh sách/i })).toBeInTheDocument();
    });

    it('navigates to /operators when back button is clicked', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      const backButton = screen.getByRole('button', { name: /về danh sách/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/operators');
    });

    it('shows back button for not found errors', () => {
      const notFoundError = new Error('not found') as Error & { digest?: string };

      render(<OperatorDetailError error={notFoundError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /về danh sách/i })).toBeInTheDocument();
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays Vietnamese title for generic error', () => {
      const error = new Error('Server error') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải dịch vụ')).toBeInTheDocument();
    });

    it('displays Vietnamese title for not found error', () => {
      const error = new Error('not found') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy dịch vụ')).toBeInTheDocument();
    });

    it('displays Vietnamese back button label', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /về danh sách/i })).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      const error = new Error('Server error') as Error & { digest?: string };

      render(<OperatorDetailError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      const { container } = render(<OperatorDetailError error={error} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });

    it('has proper padding', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      const { container } = render(<OperatorDetailError error={error} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-6');
    });
  });

  describe('Error with Digest', () => {
    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'digest123';

      render(<OperatorDetailError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[OperatorDetailError]', errorWithDigest);
    });
  });
});
