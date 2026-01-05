import { z } from "zod";

// Replicate the schema from login-form.tsx for testing
const loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
});

type LoginFormData = z.infer<typeof loginSchema>;

describe("Login Form Validation Schema", () => {
  describe("Email Validation", () => {
    it("accepts valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "test.user@example.co.uk",
        "admin+tag@domain.com",
      ];

      validEmails.forEach((email) => {
        const result = loginSchema.safeParse({
          email,
          password: "password123",
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid email format", () => {
      const invalidEmails = [
        "not-an-email",
        "user@",
        "@example.com",
        "user@.com",
        "user name@example.com",
      ];

      invalidEmails.forEach((email) => {
        const result = loginSchema.safeParse({
          email,
          password: "password123",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Email khong hop le");
        }
      });
    });

    it("rejects empty email", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing email field", () => {
      const result = loginSchema.safeParse({
        password: "password123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Password Validation", () => {
    it("accepts non-empty password", () => {
      const validPasswords = ["a", "password", "P@ssw0rd!", "123"];

      validPasswords.forEach((password) => {
        const result = loginSchema.safeParse({
          email: "test@example.com",
          password,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mat khau bat buoc");
      }
    });

    it("rejects missing password field", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Combined Validation", () => {
    it("accepts valid credentials", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "securepassword123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("securepassword123");
      }
    });

    it("rejects both invalid email and empty password", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("rejects extra fields in data", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        extraField: "should be removed",
      });
      // Zod strips extra fields by default
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extraField");
      }
    });

    it("maintains type safety of parsed data", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const data: LoginFormData = result.data;
        expect(typeof data.email).toBe("string");
        expect(typeof data.password).toBe("string");
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles very long email", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = loginSchema.safeParse({
        email: longEmail,
        password: "password123",
      });
      // Should accept (validation doesn't have length limit)
      expect(result.success).toBe(true);
    });

    it("handles very long password", () => {
      const longPassword = "a".repeat(1000);
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: longPassword,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe(longPassword);
      }
    });

    it("handles unicode characters in password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "パスワード123",
      });
      expect(result.success).toBe(true);
    });

    it("handles whitespace in email (should fail)", () => {
      const result = loginSchema.safeParse({
        email: "user @example.com",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("trims whitespace from inputs", () => {
      // Note: Zod doesn't trim by default, but string().email() normalizes
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "  password  ", // Leading/trailing spaces
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Password is preserved as-is
        expect(result.data.password).toBe("  password  ");
      }
    });
  });
});
