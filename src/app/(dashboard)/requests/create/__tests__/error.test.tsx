/**
 * Tests for create request error boundary
 * Covers: error catching, Vietnamese messages, retry/back buttons
 */

import { render, screen, fireEvent } from '@testing-library/react';
import CreateRequestError from '../error';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('CreateRequestError', () => {
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
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tạo yêu cầu')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Không thể tải trang tạo yêu cầu. Vui lòng thử lại hoặc quay lại danh sách.'
        )
      ).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[CreateRequestError]', mockError);
    });
  });

  describe('Vietnamese UI Messages', () => {
    it('displays user-friendly Vietnamese error title', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByText('Lỗi tạo yêu cầu')).toBeInTheDocument();
    });

    it('displays user-friendly Vietnamese error message', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText(
          'Không thể tải trang tạo yêu cầu. Vui lòng thử lại hoặc quay lại danh sách.'
        )
      ).toBeInTheDocument();
    });

    it('displays Vietnamese retry button label', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });

    it('displays Vietnamese back button label', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /quay lại danh sách/i })).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('renders retry button', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls reset function when retry button is clicked', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Back Navigation', () => {
    it('renders back button', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /quay lại danh sách/i })).toBeInTheDocument();
    });

    it('navigates to /requests when back button is clicked', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      const backButton = screen.getByRole('button', { name: /quay lại danh sách/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/requests');
    });
  });

  describe('Error Display', () => {
    it('renders error card with danger styling', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      const errorIcon = document.querySelector('.bg-danger-100');
      expect(errorIcon).toBeInTheDocument();
    });

    it('handles error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string };
      errorWithDigest.digest = 'create123';

      render(<CreateRequestError error={errorWithDigest} reset={mockReset} />);

      expect(mockConsoleError).toHaveBeenCalledWith('[CreateRequestError]', errorWithDigest);
    });
  });

  describe('Layout', () => {
    it('centers content in container', () => {
      const { container } = render(<CreateRequestError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'h-full', 'items-center', 'justify-center');
    });

    it('has proper padding', () => {
      const { container } = render(<CreateRequestError error={mockError} reset={mockReset} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-6');
    });
  });

  describe('Both Action Buttons', () => {
    it('renders both retry and back buttons', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quay lại danh sách/i })).toBeInTheDocument();
    });

    it('handles multiple button clicks correctly', () => {
      render(<CreateRequestError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      const backButton = screen.getByRole('button', { name: /quay lại danh sách/i });

      // Click retry first
      fireEvent.click(retryButton);
      expect(mockReset).toHaveBeenCalledTimes(1);

      // Then click back
      fireEvent.click(backButton);
      expect(mockPush).toHaveBeenCalledWith('/requests');
    });
  });
});
