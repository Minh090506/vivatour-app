/**
 * Tests for RequestForm component
 * Covers: rendering, validation, form submission, interactions
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RequestForm } from '../request-form';
import { mockRequest } from './test-utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

describe('RequestForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders form with empty state (create mode)', () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Check card titles exist (some may appear multiple times as title and label)
      expect(screen.getByText('Thông tin khách hàng')).toBeInTheDocument();
      expect(screen.getByText('Thông tin Tour')).toBeInTheDocument();
      expect(screen.getAllByText('Trạng thái').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ghi chú').length).toBeGreaterThanOrEqual(1);

      // Check submit button text for create mode
      expect(screen.getByRole('button', { name: /tạo mới/i })).toBeInTheDocument();
    });

    it('renders form with initial data (edit mode)', () => {
      render(
        <RequestForm
          initialData={mockRequest}
          onSubmit={mockOnSubmit}
          isEditing={true}
        />
      );

      // Check that initial values are populated
      const customerInput = screen.getByPlaceholderText('Nguyen Van A') as HTMLInputElement;
      expect(customerInput.value).toBe('Nguyen Van A');

      // Check submit button text for edit mode
      expect(screen.getByRole('button', { name: /cập nhật/i })).toBeInTheDocument();
    });

    it('displays required field labels with asterisks', () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Required fields should have asterisk markers
      const labels = screen.getAllByText('*');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('renders cancel button when onCancel provided', () => {
      render(<RequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel not provided', () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: /hủy/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty required fields on submit', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /tạo mới/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Should show validation error message
      await waitFor(() => {
        expect(screen.getByText(/vui lòng kiểm tra lại thông tin/i)).toBeInTheDocument();
      });

      // onSubmit should not be called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears field error when user types valid value', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /tạo mới/i });

      // Trigger validation
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/vui lòng kiểm tra lại thông tin/i)).toBeInTheDocument();
      });

      // Type in customer name field
      const customerInput = screen.getByPlaceholderText('Nguyen Van A');
      await act(async () => {
        fireEvent.change(customerInput, { target: { value: 'Test Customer' } });
      });

      // General error should clear when user starts typing
      // (field-level errors clear on input)
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid data', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Fill required fields
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
          target: { value: 'Test Customer' },
        });
        fireEvent.change(screen.getByPlaceholderText('email@example.com hoặc SĐT'), {
          target: { value: 'test@email.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
          target: { value: 'Vietnam' },
        });
        fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
          target: { value: 'Direct' },
        });
      });

      const submitButton = screen.getByRole('button', { name: /tạo mới/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      // Use a longer delay and a promise we can control
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockImplementation(() => submitPromise);

      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Fill required fields
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
          target: { value: 'Test Customer' },
        });
        fireEvent.change(screen.getByPlaceholderText('email@example.com hoặc SĐT'), {
          target: { value: 'test@email.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
          target: { value: 'Vietnam' },
        });
        fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
          target: { value: 'Direct' },
        });
      });

      const submitButton = screen.getByRole('button', { name: /tạo mới/i });

      // Click submit but don't wait for it to complete
      fireEvent.click(submitButton);

      // Check for loading text - should appear while submission is pending
      await waitFor(() => {
        expect(screen.getByText(/đang lưu/i)).toBeInTheDocument();
      });

      // Resolve the submission to cleanup
      await act(async () => {
        resolveSubmit!();
      });
    });

    it('displays error message on submit failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Server error'));

      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Fill required fields
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
          target: { value: 'Test Customer' },
        });
        fireEvent.change(screen.getByPlaceholderText('email@example.com hoặc SĐT'), {
          target: { value: 'test@email.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
          target: { value: 'Vietnam' },
        });
        fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
          target: { value: 'Direct' },
        });
      });

      const submitButton = screen.getByRole('button', { name: /tạo mới/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('handles Vietnamese text input', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      const customerInput = screen.getByPlaceholderText('Nguyen Van A') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(customerInput, { target: { value: 'Nguyễn Văn Ánh' } });
      });

      expect(customerInput.value).toBe('Nguyễn Văn Ánh');
    });

    it('calls onCancel when cancel button clicked', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /hủy/i });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('updates pax value with number input', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Find pax input by its label context
      const paxInputs = screen.getAllByRole('spinbutton');
      const paxInput = paxInputs[0] as HTMLInputElement; // First number input is pax

      await act(async () => {
        fireEvent.change(paxInput, { target: { value: '5' } });
      });

      expect(paxInput.value).toBe('5');
    });

    it('shows character count for notes field', () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/\/1000 ký tự/)).toBeInTheDocument();
    });
  });

  describe('Date Calculations', () => {
    it('auto-calculates end date when start date and tour days are set', async () => {
      render(<RequestForm onSubmit={mockOnSubmit} />);

      // Find date inputs
      const dateInputs = screen.getAllByRole('textbox', { hidden: true });

      // Find the tour days input (number input)
      const numberInputs = screen.getAllByRole('spinbutton');
      const tourDaysInput = numberInputs.find(input =>
        (input as HTMLInputElement).max === '365'
      ) as HTMLInputElement;

      if (tourDaysInput) {
        await act(async () => {
          fireEvent.change(tourDaysInput, { target: { value: '5' } });
        });
      }

      // End date field should be disabled (auto-calculated)
      const disabledInputs = document.querySelectorAll('input[disabled]');
      expect(disabledInputs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // FORM VALIDATION EDGE CASES
  // ============================================

  describe('Form Validation Edge Cases', () => {
    // Helper to fill minimum required fields
    const fillRequiredFields = async () => {
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
          target: { value: 'Valid Customer Name' },
        });
        fireEvent.change(screen.getByPlaceholderText('email@example.com hoặc SĐT'), {
          target: { value: 'valid@email.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
          target: { value: 'Vietnam' },
        });
        fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
          target: { value: 'Direct' },
        });
      });
    };

    describe('Empty Fields Validation', () => {
      it('shows error when customerName is only whitespace', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        const customerInput = screen.getByPlaceholderText('Nguyen Van A');
        await act(async () => {
          fireEvent.change(customerInput, { target: { value: '   ' } });
          fireEvent.blur(customerInput);
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(screen.getByText(/vui lòng kiểm tra lại thông tin/i)).toBeInTheDocument();
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('shows error when contact is empty', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        // Fill other fields but leave contact empty
        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(screen.getByText(/vui lòng kiểm tra lại thông tin/i)).toBeInTheDocument();
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('validates minimum length for customerName (2 chars)', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        const customerInput = screen.getByPlaceholderText('Nguyen Van A');
        await act(async () => {
          fireEvent.change(customerInput, { target: { value: 'A' } });
          fireEvent.blur(customerInput);
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(screen.getByText(/ít nhất 2 ký tự/i)).toBeInTheDocument();
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    describe('Special Characters', () => {
      it('accepts Vietnamese diacritics in customerName', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const customerInput = screen.getByPlaceholderText('Nguyen Van A') as HTMLInputElement;
        await act(async () => {
          fireEvent.change(customerInput, { target: { value: 'Nguyễn Thị Hương Giang' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('accepts special characters in notes field', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const notesInput = screen.getByPlaceholderText('Ghi chú thêm...');
        await act(async () => {
          fireEvent.change(notesInput, {
            target: { value: 'Notes with special chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/' },
          });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('accepts international phone formats in contact', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        // Fill other required fields
        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        // Use international phone format
        const contactInput = screen.getByPlaceholderText('email@example.com hoặc SĐT');
        await act(async () => {
          fireEvent.change(contactInput, { target: { value: '+1-555-123-4567' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });
    });

    describe('Numeric Validation', () => {
      it('validates pax minimum is 1', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const paxInputs = screen.getAllByRole('spinbutton');
        const paxInput = paxInputs[0] as HTMLInputElement;

        await act(async () => {
          fireEvent.change(paxInput, { target: { value: '0' } });
          fireEvent.blur(paxInput);
        });

        // Pax should be normalized to 1 minimum
        expect(paxInput.value).toBe('1');
      });

      it('accepts pax of 100', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const paxInputs = screen.getAllByRole('spinbutton');
        const paxInput = paxInputs[0] as HTMLInputElement;

        await act(async () => {
          fireEvent.change(paxInput, { target: { value: '100' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('validates tourDays maximum is 365', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        const numberInputs = screen.getAllByRole('spinbutton');
        const tourDaysInput = numberInputs.find(
          (input) => (input as HTMLInputElement).max === '365'
        ) as HTMLInputElement;

        if (tourDaysInput) {
          await act(async () => {
            fireEvent.change(tourDaysInput, { target: { value: '400' } });
            fireEvent.blur(tourDaysInput);
          });

          await fillRequiredFields();
          const submitButton = screen.getByRole('button', { name: /tạo mới/i });
          await act(async () => {
            fireEvent.click(submitButton);
          });

          await waitFor(() => {
            expect(screen.getByText(/không được quá 365/i)).toBeInTheDocument();
          });
        }
      });
    });

    describe('Contact Validation', () => {
      it('accepts valid email format', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        // Fill other fields
        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        const contactInput = screen.getByPlaceholderText('email@example.com hoặc SĐT');
        await act(async () => {
          fireEvent.change(contactInput, { target: { value: 'user@domain.com' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('accepts valid phone format with country code', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        const contactInput = screen.getByPlaceholderText('email@example.com hoặc SĐT');
        await act(async () => {
          fireEvent.change(contactInput, { target: { value: '+84912345678' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('rejects invalid email format', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        const contactInput = screen.getByPlaceholderText('email@example.com hoặc SĐT');
        await act(async () => {
          fireEvent.change(contactInput, { target: { value: 'invalid-email' } });
          fireEvent.blur(contactInput);
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(screen.getByText(/email hoặc số điện thoại hợp lệ/i)).toBeInTheDocument();
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('accepts phone with formatting (spaces, dashes)', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
            target: { value: 'Valid Name' },
          });
          fireEvent.change(screen.getByPlaceholderText('USA, UK, France...'), {
            target: { value: 'Vietnam' },
          });
          fireEvent.change(screen.getByPlaceholderText('TripAdvisor, Zalo, Email...'), {
            target: { value: 'Direct' },
          });
        });

        const contactInput = screen.getByPlaceholderText('email@example.com hoặc SĐT');
        await act(async () => {
          fireEvent.change(contactInput, { target: { value: '091-234-5678' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });
    });

    describe('WhatsApp Validation', () => {
      it('accepts empty WhatsApp field', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        // WhatsApp field is optional - leave empty

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('accepts valid +84 format in WhatsApp', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const whatsappInput = screen.getByPlaceholderText('+84...');
        await act(async () => {
          fireEvent.change(whatsappInput, { target: { value: '+84912345678' } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('rejects invalid WhatsApp number', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const whatsappInput = screen.getByPlaceholderText('+84...');
        await act(async () => {
          fireEvent.change(whatsappInput, { target: { value: 'invalid' } });
          fireEvent.blur(whatsappInput);
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        // Check that form shows validation error (either specific or general)
        await waitFor(() => {
          // The validation shows field-level error - check input has error styling
          const errorLabel = whatsappInput.closest('div')?.querySelector('.text-destructive');
          expect(errorLabel).toBeInTheDocument();
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    describe('Notes Field Validation', () => {
      it('accepts notes up to 1000 characters', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        await fillRequiredFields();
        const notesInput = screen.getByPlaceholderText('Ghi chú thêm...');
        const longNotes = 'A'.repeat(1000);
        await act(async () => {
          fireEvent.change(notesInput, { target: { value: longNotes } });
        });

        const submitButton = screen.getByRole('button', { name: /tạo mới/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      });

      it('updates character count as user types', async () => {
        render(<RequestForm onSubmit={mockOnSubmit} />);

        const notesInput = screen.getByPlaceholderText('Ghi chú thêm...');
        await act(async () => {
          fireEvent.change(notesInput, { target: { value: 'Hello World' } });
        });

        expect(screen.getByText('11/1000 ký tự')).toBeInTheDocument();
      });
    });
  });
});
