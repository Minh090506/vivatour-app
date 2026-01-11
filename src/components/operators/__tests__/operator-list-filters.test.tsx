/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { OperatorListFilters } from '../operator-list-filters';
import { defaultOperatorFilters, createMockFilters } from './test-utils';

const mockOnFilterChange = jest.fn();

// Mock scrollIntoView for Radix UI Select
Element.prototype.scrollIntoView = jest.fn();

describe('OperatorListFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders search input with placeholder', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Tìm theo tên dịch vụ, NCC, mã Booking...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders service type dropdown', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for service type select by looking for comboboxes
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(3); // At least 3 selects
    });

    it('renders payment status dropdown', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // All selects are rendered as comboboxes
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(3);
    });

    it('renders date range inputs', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Từ ngày:')).toBeInTheDocument();
      expect(screen.getByText('Đến ngày:')).toBeInTheDocument();

      const dateInputs = screen.getAllByDisplayValue('');
      const dateTypeInputs = dateInputs.filter(
        (input) => input.getAttribute('type') === 'date'
      );
      expect(dateTypeInputs).toHaveLength(2);
    });

    it('does not show clear button with no filters', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearButton = screen.queryByRole('button', { name: /xóa bộ lọc/i });
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe('Search Filter', () => {
    it('calls onFilterChange when search input changes', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Tìm theo tên dịch vụ, NCC, mã Booking...');
      fireEvent.change(searchInput, { target: { value: 'Khách sạn' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        search: 'Khách sạn',
      });
    });
  });

  describe('Service Type Filter', () => {
    it('displays "Tất cả loại DV" when no selection', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Get service type select (first combobox)
      const comboboxes = screen.getAllByRole('combobox');
      const serviceTypeSelect = comboboxes[0];
      fireEvent.click(serviceTypeSelect);

      // "Tất cả loại DV" option should be present
      expect(screen.getByRole('option', { name: 'Tất cả loại DV' })).toBeInTheDocument();
    });

    it('calls onFilterChange with selected type', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Get service type select (first combobox)
      const comboboxes = screen.getAllByRole('combobox');
      const serviceTypeSelect = comboboxes[0];
      fireEvent.click(serviceTypeSelect);

      // Select "HOTEL" option
      const hotelOption = screen.getByRole('option', { name: /khách sạn/i });
      fireEvent.click(hotelOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        serviceType: 'HOTEL',
      });
    });
  });

  describe('Payment Status Filter', () => {
    it('displays "Tất cả TT" when no selection', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Get payment status select (second combobox)
      const comboboxes = screen.getAllByRole('combobox');
      const paymentStatusSelect = comboboxes[1];
      fireEvent.click(paymentStatusSelect);

      // "Tất cả TT" option should be present
      expect(screen.getByRole('option', { name: 'Tất cả TT' })).toBeInTheDocument();
    });

    it('calls onFilterChange with selected status', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Get payment status select (second combobox)
      const comboboxes = screen.getAllByRole('combobox');
      const paymentStatusSelect = comboboxes[1];
      fireEvent.click(paymentStatusSelect);

      // Select "PENDING" option (Chờ thanh toán)
      const pendingOption = screen.getByRole('option', { name: 'Chờ thanh toán' });
      fireEvent.click(pendingOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        paymentStatus: 'PENDING',
      });
    });
  });

  describe('Lock Status Filter', () => {
    it('sets isLocked to true when locked selected', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Get lock status select (third combobox)
      const comboboxes = screen.getAllByRole('combobox');
      const lockStatusSelect = comboboxes[2];
      fireEvent.click(lockStatusSelect);

      // Select "Đã khóa" (locked)
      const lockedOption = screen.getByRole('option', { name: 'Đã khóa' });
      fireEvent.click(lockedOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        isLocked: true,
      });
    });

    it('sets isLocked to false when unlocked selected', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const comboboxes = screen.getAllByRole('combobox');
      fireEvent.click(comboboxes[2]);

      const unlockedOption = screen.getByRole('option', { name: 'Chưa khóa' });
      fireEvent.click(unlockedOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        isLocked: false,
      });
    });

    it('sets isLocked to undefined when all selected', () => {
      // Start with isLocked: true so clicking "Tất cả" triggers a change
      const filtersWithLocked = createMockFilters({ isLocked: true });

      render(
        <OperatorListFilters
          filters={filtersWithLocked}
          onFilterChange={mockOnFilterChange}
        />
      );

      const comboboxes = screen.getAllByRole('combobox');
      fireEvent.click(comboboxes[2]);

      const allOption = screen.getByRole('option', { name: 'Tất cả' });
      fireEvent.click(allOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithLocked,
        isLocked: undefined,
      });
    });
  });

  describe('Date Range Filters', () => {
    it('calls onFilterChange when fromDate changes', () => {
      const { container } = render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      const fromDateInput = dateInputs[0];

      fireEvent.change(fromDateInput, { target: { value: '2026-01-01' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        fromDate: '2026-01-01',
      });
    });

    it('calls onFilterChange when toDate changes', () => {
      const { container } = render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      const toDateInput = dateInputs[1];

      fireEvent.change(toDateInput, { target: { value: '2026-01-31' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        toDate: '2026-01-31',
      });
    });
  });

  describe('Include Archived', () => {
    it('calls onFilterChange when checkbox toggled', () => {
      render(
        <OperatorListFilters
          filters={defaultOperatorFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /hiện đã lưu trữ/i });

      // First click toggles ON
      fireEvent.click(checkbox);
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultOperatorFilters,
        includeArchived: true,
      });
    });

    it('toggles checkbox off when clicked again', () => {
      // Start with includeArchived: true
      const filtersWithArchived = createMockFilters({ includeArchived: true });

      render(
        <OperatorListFilters
          filters={filtersWithArchived}
          onFilterChange={mockOnFilterChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /hiện đã lưu trữ/i });

      // Click to toggle OFF
      fireEvent.click(checkbox);
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithArchived,
        includeArchived: false,
      });
    });
  });

  describe('Clear Filters', () => {
    it('shows "Xóa bộ lọc" button when filters active', () => {
      const filtersWithData = createMockFilters({
        search: 'test',
        serviceType: 'HOTEL',
      });

      render(
        <OperatorListFilters
          filters={filtersWithData}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /xóa bộ lọc/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('resets all filters to defaults on click', () => {
      const filtersWithData = createMockFilters({
        search: 'Khách sạn',
        serviceType: 'HOTEL',
        paymentStatus: 'UNPAID',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        isLocked: true,
        includeArchived: true,
      });

      render(
        <OperatorListFilters
          filters={filtersWithData}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /xóa bộ lọc/i });
      fireEvent.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        search: '',
        serviceType: '',
        paymentStatus: '',
        fromDate: '',
        toDate: '',
        isLocked: undefined,
        includeArchived: false,
      });
    });
  });
});
