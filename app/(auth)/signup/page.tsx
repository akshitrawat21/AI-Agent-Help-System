import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create a workspace" };

export default function SignupPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-1.5 text-center">
        <h1 className="display text-[38px]">Create your workspace</h1>
        <p className="text-[13px] text-muted-foreground">
          Free to set up. You'll be answering questions in a minute.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
