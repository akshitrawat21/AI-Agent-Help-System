import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-1.5 text-center">
        <h1 className="display text-[38px]">Welcome back</h1>
        <p className="text-[13px] text-muted-foreground">
          Sign in to your workspace.
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
