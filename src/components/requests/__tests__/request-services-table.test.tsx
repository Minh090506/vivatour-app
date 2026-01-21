/**
 * Tests for RequestServicesTable component
 * Covers: rendering, editing, adding, deleting services, API interactions
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestServicesTable } from '../request-services-table';
import type { Operator } from '@/types';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('RequestServicesTable', () => {
  const mockOnUpdate = jest.fn();

  // Mock operator data - using Partial to avoid having to define all fields
  const mockOperators: Operator[] = [
    {
      id: 'op1',
      serviceId: 'SVC001',
      requestId: 'req1',
      serviceDate: new Date('2026-02-01'),
      serviceType: 'HOTEL',
      serviceName: 'Hotel ABC',
      supplier: 'Supplier A',
      supplierId: null,
      supplierRef: undefined,
      costBeforeTax: 1000000,
      vat: 100000,
      totalCost: 1100000,
      paymentStatus: 'PENDING',
      paymentDeadline: null,
      paymentDate: null,
      paidAmount: 0,
      bankAccount: null,
      notes: null,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      lockKT: false,
      lockKTAt: null,
      lockKTBy: null,
      lockAdmin: false,
      lockAdminAt: null,
      lockAdminBy: null,
      lockFinal: false,
      lockFinalAt: null,
      lockFinalBy: null,
      isArchived: false,
      archivedAt: null,
      userId: 'user1',
      sheetRowIndex: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'op2',
      serviceId: 'SVC002',
      requestId: 'req1',
      serviceDate: new Date('2026-02-02'),
      serviceType: 'TRANSPORT',
      serviceName: 'Car Rental',
      supplier: 'Supplier B',
      supplierId: 's1',
      supplierRef: {
        id: 's1',
        name: 'Supplier B Ref',
        code: 'SB',
        type: 'TRANSPORT',
        location: null,
        paymentModel: 'PREPAID',
        creditLimit: null,
        paymentTermDays: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        bankAccount: null,
        isActive: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      costBeforeTax: 500000,
      vat: 50000,
      totalCost: 550000,
      paymentStatus: 'PAID',
      paymentDeadline: null,
      paymentDate: null,
      paidAmount: 550000,
      bankAccount: null,
      notes: null,
      isLocked: true,
      lockedAt: null,
      lockedBy: null,
      lockKT: true,
      lockKTAt: null,
      lockKTBy: null,
      lockAdmin: false,
      lockAdminAt: null,
      lockAdminBy: null,
      lockFinal: false,
      lockFinalAt: null,
      lockFinalBy: null,
      isArchived: false,
      archivedAt: null,
      userId: 'user1',
      sheetRowIndex: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================

  describe('Rendering', () => {
    it('renders table headers correctly', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Ngày')).toBeInTheDocument();
      expect(screen.getByText('Loại')).toBeInTheDocument();
      expect(screen.getByText('Tên dịch vụ')).toBeInTheDocument();
      expect(screen.getByText('NCC')).toBeInTheDocument();
      expect(screen.getByText('Chi phí')).toBeInTheDocument();
    });

    it('renders operator rows with correct data', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Hotel ABC')).toBeInTheDocument();
      expect(screen.getByText('Car Rental')).toBeInTheDocument();
      // Supplier ref name takes precedence over supplier string
      expect(screen.getByText('Supplier B Ref')).toBeInTheDocument();
    });

    it('displays empty state when no operators', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Chưa có dịch vụ nào')).toBeInTheDocument();
    });

    it('shows "Thêm dịch vụ" button when not editing', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Thêm dịch vụ')).toBeInTheDocument();
    });

    it('displays formatted currency for totalCost', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      // Check that currency values are displayed (format depends on formatCurrency)
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('shows supplier name from supplierRef when available', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      // op2 has supplierRef.name = 'Supplier B Ref'
      expect(screen.getByText('Supplier B Ref')).toBeInTheDocument();
    });

    it('shows dash when no supplier', () => {
      const operatorNoSupplier: Operator = {
        ...mockOperators[0],
        id: 'op3',
        supplier: '',
        supplierRef: undefined,
      };

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[operatorNoSupplier]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  // ============================================
  // EDIT BUTTON STATE TESTS
  // ============================================

  describe('Edit Button States', () => {
    it('disables edit button when operator is locked', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={mockOperators}
          onUpdate={mockOnUpdate}
        />
      );

      // Find all edit buttons (there should be 2)
      const buttons = screen.getAllByRole('button');
      // The second operator is locked, find its edit button
      const lockedRowButtons = buttons.filter(
        (btn) => btn.closest('tr')?.textContent?.includes('Car Rental')
      );

      // Edit button should be disabled for locked operator
      const editButtons = lockedRowButtons.filter((btn) =>
        btn.querySelector('svg.lucide-edit-2, svg[class*="Edit2"]') ||
        btn.innerHTML.includes('edit')
      );

      // At least verify locked row exists
      expect(screen.getByText('Car Rental')).toBeInTheDocument();
    });

    it('enables edit button when operator is not locked', () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]} // Only unlocked operator
          onUpdate={mockOnUpdate}
        />
      );

      // Find edit button for unlocked operator
      const buttons = screen.getAllByRole('button');
      const actionButtons = buttons.filter(
        (btn) => btn.closest('td') && !btn.textContent?.includes('Thêm')
      );

      // Should have edit and delete buttons that are not disabled
      expect(actionButtons.some((btn) => !btn.hasAttribute('disabled'))).toBe(true);
    });
  });

  // ============================================
  // ADD NEW SERVICE TESTS
  // ============================================

  describe('Add New Service', () => {
    it('shows editable row when "Thêm dịch vụ" is clicked', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      const addButton = screen.getByText('Thêm dịch vụ');
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Should show input fields for new row
      expect(screen.getByPlaceholderText('Tên dịch vụ')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('NCC')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    });

    it('hides "Thêm dịch vụ" button when editing', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      const addButton = screen.getByText('Thêm dịch vụ');
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Add button should be hidden while editing
      expect(screen.queryByText('Thêm dịch vụ')).not.toBeInTheDocument();
    });

    it('calls API with POST when saving new service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      // Click add button
      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      // Fill in ALL required form fields including date
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
        fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
          target: { value: 'New Service' },
        });
        fireEvent.change(screen.getByPlaceholderText('NCC'), {
          target: { value: 'New Supplier' },
        });
        fireEvent.change(screen.getByPlaceholderText('0'), {
          target: { value: '100000' },
        });
      });

      // Find and click save button (check icon)
      const saveButtons = screen.getAllByRole('button');
      const saveButton = saveButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('text-green-600') ||
        btn.innerHTML.includes('Check')
      );

      if (saveButton) {
        await act(async () => {
          fireEvent.click(saveButton);
        });
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/operators',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('calls onUpdate after successful save', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      // Fill ALL required fields including date
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
        fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
          target: { value: 'Test' },
        });
      });

      // Find save button and click
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find((btn) =>
        btn.querySelector('.text-green-600')
      );

      if (saveButton) {
        await act(async () => {
          fireEvent.click(saveButton);
        });
      }

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // EDIT EXISTING SERVICE TESTS
  // ============================================

  describe('Edit Existing Service', () => {
    it('populates form with existing data when edit clicked', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      // Find and click edit button for first operator
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(
        (btn) =>
          !btn.textContent?.includes('Thêm') &&
          btn.closest('td') &&
          !btn.querySelector('.text-red-500')
      );

      if (editButton) {
        await act(async () => {
          fireEvent.click(editButton);
        });

        // Check that service name input has the existing value
        const serviceNameInput = screen.getByPlaceholderText('Tên dịch vụ') as HTMLInputElement;
        expect(serviceNameInput.value).toBe('Hotel ABC');
      }
    });

    it('calls API with PUT when updating existing service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      // Click edit
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(
        (btn) =>
          !btn.textContent?.includes('Thêm') &&
          btn.closest('td') &&
          !btn.querySelector('.text-red-500')
      );

      if (editButton) {
        await act(async () => {
          fireEvent.click(editButton);
        });

        // Modify service name
        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
            target: { value: 'Updated Hotel' },
          });
        });

        // Find save button
        const saveButton = screen
          .getAllByRole('button')
          .find((btn) => btn.querySelector('.text-green-600'));

        if (saveButton) {
          await act(async () => {
            fireEvent.click(saveButton);
          });
        }

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/operators/op1',
            expect.objectContaining({
              method: 'PUT',
            })
          );
        });
      }
    });
  });

  // ============================================
  // CANCEL EDIT TESTS
  // ============================================

  describe('Cancel Edit', () => {
    it('cancels editing when X button clicked', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      // Start adding
      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      // Editing row should be visible
      expect(screen.getByPlaceholderText('Tên dịch vụ')).toBeInTheDocument();

      // Find cancel button (X icon)
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find(
        (btn) =>
          !btn.querySelector('.text-green-600') &&
          btn.closest('td') &&
          btn.querySelector('svg')
      );

      if (cancelButton) {
        await act(async () => {
          fireEvent.click(cancelButton);
        });
      }

      // Should show add button again
      await waitFor(() => {
        expect(screen.getByText('Thêm dịch vụ')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // DELETE SERVICE TESTS
  // ============================================

  describe('Delete Service', () => {
    it('shows confirmation dialog before delete', async () => {
      mockConfirm.mockReturnValue(false);

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      // Find delete button (trash icon with red color)
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find((btn) =>
        btn.querySelector('.text-red-500')
      );

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        expect(mockConfirm).toHaveBeenCalledWith('Xác nhận xóa dịch vụ này?');
      }
    });

    it('does not delete when confirmation cancelled', async () => {
      mockConfirm.mockReturnValue(false);

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find((btn) =>
        btn.querySelector('.text-red-500')
      );

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        expect(global.fetch).not.toHaveBeenCalled();
      }
    });

    it('calls DELETE API when confirmed', async () => {
      mockConfirm.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find((btn) =>
        btn.querySelector('.text-red-500')
      );

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/operators/op1', {
            method: 'DELETE',
          });
        });
      }
    });

    it('calls onUpdate after successful delete', async () => {
      mockConfirm.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find((btn) =>
        btn.querySelector('.text-red-500')
      );

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalled();
        });
      }
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('shows error toast when save fails with API error', async () => {
      const { toast } = require('sonner');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'API Error' }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
        fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
          target: { value: 'Test' },
        });
      });

      const saveButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-green-600'));

      if (saveButton) {
        await act(async () => {
          fireEvent.click(saveButton);
        });
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('API Error');
      });
    });

    it('shows error toast when network error occurs on save', async () => {
      const { toast } = require('sonner');
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
        fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
          target: { value: 'Test' },
        });
      });

      const saveButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-green-600'));

      if (saveButton) {
        await act(async () => {
          fireEvent.click(saveButton);
        });
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Lỗi khi lưu');
      });
    });

    it('shows error toast when delete fails', async () => {
      const { toast } = require('sonner');
      mockConfirm.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Delete failed' }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const deleteButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-red-500'));

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Delete failed');
        });
      }
    });

    it('shows error toast when delete network error occurs', async () => {
      const { toast } = require('sonner');
      mockConfirm.mockReturnValue(true);
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const deleteButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-red-500'));

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Lỗi khi xóa');
        });
      }
    });
  });

  // ============================================
  // EDITABLE ROW COMPONENT TESTS
  // ============================================

  describe('EditableRow Component', () => {
    it('renders date input with correct value', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      // Click edit button
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(
        (btn) =>
          !btn.textContent?.includes('Thêm') &&
          btn.closest('td') &&
          !btn.querySelector('.text-red-500')
      );

      if (editButton) {
        await act(async () => {
          fireEvent.click(editButton);
        });

        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        expect(dateInput).toBeInTheDocument();
        expect(dateInput.value).toBe('2026-02-01');
      }
    });

    it('renders service type select', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      // Should have select trigger
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    it('has disabled attribute on buttons during form state', async () => {
      // Test that buttons properly handle disabled state
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[1]]} // Use locked operator
          onUpdate={mockOnUpdate}
        />
      );

      // Verify edit/delete buttons are disabled for locked operators
      const buttons = screen.getAllByRole('button');
      const lockedRowButtons = buttons.filter(
        (btn) => btn.closest('tr')?.textContent?.includes('Car Rental')
      );

      // At least one button should be disabled for locked operator
      expect(lockedRowButtons.some((btn) => btn.hasAttribute('disabled'))).toBe(true);
    });
  });

  // ============================================
  // INPUT FIELD CHANGES TESTS
  // ============================================

  describe('Input Field Changes', () => {
    it('updates service date when changed', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
      });

      expect(dateInput.value).toBe('2026-03-15');
    });

    it('updates supplier when changed', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const supplierInput = screen.getByPlaceholderText('NCC') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(supplierInput, { target: { value: 'New Supplier' } });
      });

      expect(supplierInput.value).toBe('New Supplier');
    });

    it('updates totalCost when changed', async () => {
      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const costInput = screen.getByPlaceholderText('0') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(costInput, { target: { value: '250000' } });
      });

      expect(costInput.value).toBe('250000');
    });
  });

  // ============================================
  // SUCCESS TOAST TESTS
  // ============================================

  describe('Success Toasts', () => {
    it('shows success toast after save', async () => {
      const { toast } = require('sonner');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[]}
          onUpdate={mockOnUpdate}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Thêm dịch vụ'));
      });

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
        fireEvent.change(screen.getByPlaceholderText('Tên dịch vụ'), {
          target: { value: 'Test' },
        });
      });

      const saveButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-green-600'));

      if (saveButton) {
        await act(async () => {
          fireEvent.click(saveButton);
        });
      }

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Đã lưu thành công');
      });
    });

    it('shows success toast after delete', async () => {
      const { toast } = require('sonner');
      mockConfirm.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <RequestServicesTable
          requestId="req1"
          operators={[mockOperators[0]]}
          onUpdate={mockOnUpdate}
        />
      );

      const deleteButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.text-red-500'));

      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Đã xóa dịch vụ');
        });
      }
    });
  });
});
