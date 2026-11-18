import Link from "next/link";
import Brand from "@/components/Brand";

export const metadata = {
  title: "Email confirmation | Kavyx",
  description: "Return to the Kavyx app after confirming your email.",
  robots: { index: false, follow: false },
};

export default function VerifiedPage() {
  return (
    <main className="verify-page">
      <div className="verify-card">
        <Brand />
        <h1>Return to Kavyx.</h1>
        <p>Open the Kavyx app and sign in with the email and password you used to create your account.</p>
        <p>If the app still asks you to verify your email, open the confirmation link from your inbox again.</p>
        <Link className="button outline" href="/">Back to the website <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
