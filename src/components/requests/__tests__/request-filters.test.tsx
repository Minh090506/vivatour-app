/**
 * Tests for RequestFilters component
 * Covers: rendering, filter changes, conditional seller filter
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { RequestFilters } from '../request-filters';
import { mockSellers, defaultFilters } from './test-utils';
import type { RequestFilters as FiltersType } from '@/types';

describe('RequestFilters', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all filter controls', () => {
      render(<RequestFilters filters={defaultFilters} onChange={mockOnChange} />);

      // Check labels
      expect(screen.getByText('Phễu')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
      expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
      expect(screen.getByText('Khoảng thời gian')).toBeInTheDocument();

      // Check search input
      expect(screen.getByPlaceholderText('Tìm theo tên, mã...')).toBeInTheDocument();
    });

    it('hides seller filter when showSellerFilter=false', () => {
      render(
        <RequestFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          showSellerFilter={false}
        />
      );

      // Seller label should not be present
      expect(screen.queryByText('Seller')).not.toBeInTheDocument();
    });

    it('shows seller filter when showSellerFilter=true and sellers provided', () => {
      render(
        <RequestFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          showSellerFilter={true}
          sellers={mockSellers}
        />
      );

      // Seller label should be present
      expect(screen.getByText('Seller')).toBeInTheDocument();
    });

    it('hides seller filter when showSellerFilter=true but no sellers', () => {
      render(
        <RequestFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          showSellerFilter={true}
          sellers={[]}
        />
      );

      // Seller label should not be present (no sellers to show)
      expect(screen.queryByText('Seller')).not.toBeInTheDocument();
    });

    it('renders date range inputs', () => {
      const { container } = render(
        <RequestFilters filters={defaultFilters} onChange={mockOnChange} />
      );

      // Should have two date inputs
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });
  });

  describe('Filter Changes', () => {
    it('calls onChange when search input changes', () => {
      render(<RequestFilters filters={defaultFilters} onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText('Tìm theo tên, mã...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'test search',
      });
    });

    it('calls onChange when fromDate changes', () => {
      const { container } = render(
        <RequestFilters filters={defaultFilters} onChange={mockOnChange} />
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        fromDate: '2026-01-01',
      });
    });

    it('calls onChange when toDate changes', () => {
      const { container } = render(
        <RequestFilters filters={defaultFilters} onChange={mockOnChange} />
      );

      const dateInputs = container.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        toDate: '2026-01-31',
      });
    });

    it('preserves existing filter values when updating one filter', () => {
      const existingFilters: FiltersType = {
        ...defaultFilters,
        status: 'BOOKING',
        stage: 'OUTCOME',
      };

      render(<RequestFilters filters={existingFilters} onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText('Tìm theo tên, mã...');
      fireEvent.change(searchInput, { target: { value: 'new search' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...existingFilters,
        search: 'new search',
      });
    });
  });

  describe('Filter Display', () => {
    it('displays current search value', () => {
      const filtersWithSearch: FiltersType = {
        ...defaultFilters,
        search: 'existing search',
      };

      render(<RequestFilters filters={filtersWithSearch} onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText('Tìm theo tên, mã...') as HTMLInputElement;
      expect(searchInput.value).toBe('existing search');
    });

    it('displays current date range values', () => {
      const filtersWithDates: FiltersType = {
        ...defaultFilters,
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
      };

      const { container } = render(
        <RequestFilters filters={filtersWithDates} onChange={mockOnChange} />
      );

      const dateInputs = container.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
      expect(dateInputs[0].value).toBe('2026-01-01');
      expect(dateInputs[1].value).toBe('2026-01-31');
    });
  });

  describe('Select Components', () => {
    it('renders stage select with Phễu label', () => {
      render(<RequestFilters filters={defaultFilters} onChange={mockOnChange} />);

      // The select trigger should be present
      const triggers = screen.getAllByRole('combobox');
      expect(triggers.length).toBeGreaterThanOrEqual(2); // At least stage and status
    });

    it('renders status select with Trạng thái label', () => {
      render(<RequestFilters filters={defaultFilters} onChange={mockOnChange} />);

      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    });
  });

  describe('Seller Filter', () => {
    it('shows all sellers in dropdown when filter visible', () => {
      render(
        <RequestFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          showSellerFilter={true}
          sellers={mockSellers}
        />
      );

      // Seller section should be rendered
      expect(screen.getByText('Seller')).toBeInTheDocument();
    });
  });

  describe('Filter Container', () => {
    it('renders with correct container styling', () => {
      const { container } = render(
        <RequestFilters filters={defaultFilters} onChange={mockOnChange} />
      );

      // Should have the filter container with background
      const filterContainer = container.querySelector('.bg-muted\\/50');
      expect(filterContainer).toBeInTheDocument();
    });

    it('renders filters in flex layout', () => {
      const { container } = render(
        <RequestFilters filters={defaultFilters} onChange={mockOnChange} />
      );

      // Should have flex container
      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
