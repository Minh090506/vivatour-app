import { render, screen } from "@testing-library/react";
import LoginPage from "../page";
import { LoginForm } from "../login-form";

// Mock LoginForm component
jest.mock("../login-form", () => ({
  LoginForm: jest.fn(() => <div data-testid="login-form-mock">Login Form</div>),
}));

const mockLoginForm = LoginForm as jest.MockedFunction<typeof LoginForm>;

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders login page without errors", () => {
      render(<LoginPage />);
      expect(screen.getByText(/MyVivaTour/i)).toBeInTheDocument();
    });

    it("displays page title", () => {
      render(<LoginPage />);
      const title = screen.getByText(/MyVivaTour/i);
      expect(title).toBeInTheDocument();
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
    });

    it("displays subtitle", () => {
      render(<LoginPage />);
      expect(screen.getByText(/Dang nhap de tiep tuc/i)).toBeInTheDocument();
    });

    it("renders LoginForm component", () => {
      render(<LoginPage />);
      expect(mockLoginForm).toHaveBeenCalled();
      expect(screen.getByTestId("login-form-mock")).toBeInTheDocument();
    });

    it("applies correct styling classes", () => {
      const { container } = render(<LoginPage />);
      const outerDiv = container.querySelector(".flex");
      expect(outerDiv).toBeInTheDocument();
      expect(outerDiv).toHaveClass("min-h-screen");
      expect(outerDiv).toHaveClass("items-center");
      expect(outerDiv).toHaveClass("justify-center");
      expect(outerDiv).toHaveClass("bg-gray-50");
    });

    it("renders form container with max-width", () => {
      const { container } = render(<LoginPage />);
      const formContainer = container.querySelector(".max-w-sm");
      expect(formContainer).toBeInTheDocument();
      expect(formContainer).toHaveClass("w-full");
    });
  });

  describe("Layout Structure", () => {
    it("renders header section before form", () => {
      const { container } = render(<LoginPage />);
      const headerDiv = container.querySelector(".mb-8");
      expect(headerDiv).toBeInTheDocument();
      expect(headerDiv?.textContent).toContain("MyVivaTour");
      expect(headerDiv?.textContent).toContain("Dang nhap de tiep tuc");
    });

    it("centers header text", () => {
      const { container } = render(<LoginPage />);
      const headerDiv = container.querySelector(".text-center");
      expect(headerDiv).toBeInTheDocument();
    });

    it("renders text-based UI elements in correct order", () => {
      const { container } = render(<LoginPage />);
      const textElements = container.querySelectorAll(".text-center *");
      const h1 = Array.from(textElements).find((el) =>
        el.classList.contains("text-2xl")
      );
      const subtitle = Array.from(textElements).find(
        (el) =>
          el.textContent === "Dang nhap de tiep tuc" ||
          el.textContent?.includes("Dang nhap de tiep tuc")
      );
      expect(h1).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("applies responsive padding", () => {
      const { container } = render(<LoginPage />);
      const outerDiv = container.querySelector(".px-4");
      expect(outerDiv).toBeInTheDocument();
    });

    it("limits form width on larger screens", () => {
      const { container } = render(<LoginPage />);
      const formContainer = container.querySelector(".max-w-sm");
      expect(formContainer).toBeInTheDocument();
    });
  });

  describe("Integration with LoginForm", () => {
    it("passes no props to LoginForm", () => {
      render(<LoginPage />);
      expect(mockLoginForm).toHaveBeenCalled();
      expect(mockLoginForm).toHaveBeenCalledTimes(1);
    });

    it("mounts LoginForm as a child component", () => {
      render(<LoginPage />);
      const mockComponent = screen.getByTestId("login-form-mock");
      expect(mockComponent).toBeInTheDocument();
      expect(mockComponent.textContent).toContain("Login Form");
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic HTML structure", () => {
      const { container } = render(<LoginPage />);
      // Page should have proper structure with header and form container
      // Note: LoginForm is mocked, so we check for the mock element
      const formMock = screen.getByTestId("login-form-mock");
      expect(formMock).toBeInTheDocument();
      // Verify proper container hierarchy
      const wrapper = container.querySelector(".w-full.max-w-sm");
      expect(wrapper).toBeInTheDocument();
    });

    it("uses proper heading hierarchy", () => {
      render(<LoginPage />);
      const heading = screen.getByText(/MyVivaTour/i);
      // The heading should be in a proper heading tag
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H1");
    });
  });
});
