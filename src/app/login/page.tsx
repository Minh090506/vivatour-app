import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MyVivaTour</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dang nhap de tiep tuc
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
