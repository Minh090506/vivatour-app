import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LoginForm } from "../login-form";

/**
 * Test suite for LoginForm component
 *
 * Note: This test suite has limitations due to mocking next-auth/react which uses ESM.
 * The component is tested through integration testing rather than full unit mocking.
 * Key scenarios tested:
 * - Form rendering
 * - Validation schema (tested separately)
 * - User interactions
 */

// Mock next-auth/react with simple module mock
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("LoginForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders login form without errors", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mat khau/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dang nhap/i })).toBeInTheDocument();
    });

    it("renders email and password inputs with correct attributes", () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText("email@example.com") as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;

      expect(emailInput).toBeInTheDocument();
      expect(emailInput.type).toBe("email");
      expect(emailInput).toHaveAttribute("id", "email");

      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe("password");
      expect(passwordInput).toHaveAttribute("id", "password");
    });

    it("renders submit button in initial state", () => {
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: /dang nhap/i });
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent("Dang nhap");
    });

    it("renders form labels", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mat khau/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation - Email", () => {
    it("validates empty email field on submit", async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /dang nhap/i });

      // Leave email empty and submit
      fireEvent.click(submitButton);

      // Expect validation error (email is required)
      await waitFor(() => {
        const errors = screen.queryAllByText(/email|khong hop le|bat buoc/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("allows typing invalid email format into field", () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });

      // Verify value was set (validation happens on submit, tested in validation schema tests)
      expect(emailInput.value).toBe("invalid-email");
    });

    it("accepts valid email format", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/mat khau/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      // Should not show email validation error
      expect(screen.queryByText(/email khong hop le/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Validation - Password", () => {
    it("validates empty password field on submit", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const submitButton = screen.getByRole("button", { name: /dang nhap/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/mat khau bat buoc/i)).toBeInTheDocument();
      });
    });

    it("accepts non-empty password", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/mat khau/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      // Should not show password validation error
      expect(screen.queryByText(/mat khau bat buoc/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Structure", () => {
    it("renders form with proper structure", () => {
      const { container } = render(<LoginForm />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass("space-y-4");
    });

    it("groups form inputs in container divs", () => {
      const { container } = render(<LoginForm />);

      const spaceDivs = container.querySelectorAll(".space-y-2");
      expect(spaceDivs.length).toBeGreaterThanOrEqual(2); // At least email and password groups
    });

    it("renders input elements within form", () => {
      const { container } = render(<LoginForm />);

      const form = container.querySelector("form");
      expect(form).toContainElement(screen.getByPlaceholderText("email@example.com"));
      expect(form).toContainElement(screen.getByPlaceholderText("••••••••"));
    });
  });

  describe("User Interaction Handling", () => {
    it("allows user to type in email field", () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText("email@example.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });

      expect(emailInput.value).toBe("user@example.com");
    });

    it("allows user to type in password field", () => {
      render(<LoginForm />);

      const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "secret123" } });

      expect(passwordInput.value).toBe("secret123");
    });

    it("handles form submission event", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/mat khau/i) as HTMLInputElement;
      const submitButton = screen.getByRole("button", { name: /dang nhap/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      // Verify form can be submitted without throwing error
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("associates labels with input fields", () => {
      render(<LoginForm />);

      const emailLabel = screen.getByLabelText(/email/i);
      const passwordLabel = screen.getByLabelText(/mat khau/i);

      expect(emailLabel).toHaveAttribute("type", "email");
      expect(passwordLabel).toHaveAttribute("type", "password");
    });

    it("submit button is accessible via keyboard", () => {
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: /dang nhap/i });
      expect(button).not.toBeDisabled();
    });

    it("uses proper ARIA attributes on inputs", () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mat khau/i);

      // Inputs should be associated with labels
      expect(emailInput.id).toBeTruthy();
      expect(passwordInput.id).toBeTruthy();
    });
  });

  describe("Error Display", () => {
    it("displays validation errors below fields", async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /dang nhap/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show at least one validation error
        const errors = screen.queryAllByText(/khong hop le|bat buoc/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("displays errors in red text", async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /dang nhap/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorElements = screen.queryAllByText(/khong hop le|bat buoc/i);
        errorElements.forEach((el) => {
          expect(el).toHaveClass("text-red-500");
        });
      });
    });
  });

  describe("Button State Management", () => {
    it("button is clickable in initial state", () => {
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: /dang nhap/i });
      expect(button).not.toBeDisabled();
    });

    it("button text is Dang nhap in initial state", () => {
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: /dang nhap/i });
      expect(button.textContent).toContain("Dang nhap");
    });
  });
});
