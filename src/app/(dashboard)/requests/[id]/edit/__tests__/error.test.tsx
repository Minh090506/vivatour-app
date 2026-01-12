/**
 * Tests for edit request error boundary
 * Covers: error catching, not found handling, Vietnamese messages, retry/cancel buttons
 */

import { render, screen, fireEvent } from '@testing-library/react';
import EditRequestError from '../error';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'test-id-123' }),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('EditRequestError', () => {
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
      render(<EditRequestError error={genericError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải form chỉnh sửa')).toBeInTheDocument();
      expect(
        screen.getByText('Không thể tải dữ liệu để chỉnh sửa. Vui lòng thử lại.')
      ).toBeInTheDocument();
    });

    it('shows retry button for generic errors', () => {
      render(<EditRequestError error={genericError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });

    it('calls reset when retry is clicked for generic errors', () => {
      render(<EditRequestError error={genericError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('logs error to console', () => {
      render(<EditRequestError error={genericError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[EditRequestError]', genericError);
    });
  });

  describe('Not Found Error Handling', () => {
    it('detects "not found" in English error message (lowercase)', () => {
      const notFoundError = new Error('Request not found') as Error & { digest?: string };

      render(<EditRequestError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy yêu cầu')).toBeInTheDocument();
      expect(
        screen.getByText('Yêu cầu này không tồn tại hoặc đã bị xóa.')
      ).toBeInTheDocument();
    });

    it('detects "Not Found" in English error message (mixed case)', () => {
      const notFoundError = new Error('Resource Not Found') as Error & { digest?: string };

      render(<EditRequestError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy yêu cầu')).toBeInTheDocument();
    });

    it('detects Vietnamese "không tìm thấy" error message', () => {
      const notFoundError = new Error('Không tìm thấy yêu cầu') as Error & {
        digest?: string;
      };

      render(<EditRequestError error={notFoundError} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy yêu cầu')).toBeInTheDocument();
      expect(
        screen.getByText('Yêu cầu này không tồn tại hoặc đã bị xóa.')
      ).toBeInTheDocument();
    });

    it('does not show retry button for not found errors', () => {
      const notFoundError = new Error('not found') as Error & { digest?: string };

      render(<EditRequestError error={notFoundError} reset={mockReset} />);

      expect(screen.queryByRole('button', { name: /thử lại/i })).not.toBeInTheDocument();
    });
  });

  describe('Cancel Navigation', () => {
    it('renders cancel button', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /hủy chỉnh sửa/i })).toBeInTheDocument();
    });

    it('navigates to detail page when cancel button is clicked with valid id', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      const cancelButton = screen.getByRole('button', { name: /hủy chỉnh sửa/i });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/requests/test-id-123');
    });

    it('shows cancel button for not found errors', () => {
      const notFoundError = new Error('not found') as Error & { digest?: string };

      render(<EditRequestError error={notFoundError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /hủy chỉnh sửa/i })).toBeInTheDocument();
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays Vietnamese title for generic error', () => {
      const error = new Error('Server error') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      expect(screen.getByText('Lỗi tải form chỉnh sửa')).toBeInTheDocument();
    });

    it('displays Vietnamese title for not found error', () => {
      const error = new Error('not found') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      expect(screen.getByText('Không tìm thấy yêu cầu')).toBeInTheDocument();
    });

    it('displays Vietnamese cancel button label', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /hủy chỉnh sửa/i })).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      const error = new Error('Server error') as Error & { digest?: string };

      render(<EditRequestError error={error} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      const { container } = render(<EditRequestError error={error} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });

    it('has proper padding', () => {
      const error = new Error('Test error') as Error & { digest?: string };

      const { container } = render(<EditRequestError error={error} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-6');
    });
  });

  describe('Error with Digest', () => {
    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'edit-request-digest456';

      render(<EditRequestError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[EditRequestError]', errorWithDigest);
    });
  });
});

