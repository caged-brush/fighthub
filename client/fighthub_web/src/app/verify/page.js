export const metadata = {
  title: "Email verified • Kavyx",
  description:
    "Your email has been verified. Return to the Kavyx app and log in.",
};

export default function VerifiedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#121212",
          borderRadius: 18,
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,215,0,0.12)",
              border: "1px solid rgba(255,215,0,0.35)",
              color: "#ffd700",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            ✓
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: "30px",
                fontWeight: 900,
                color: "#ffd700",
              }}
            >
              Email verified
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.70)",
                lineHeight: "20px",
                fontSize: 14,
              }}
            >
              Your email is now verified.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>
            What to do next:
          </p>

          <ol
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              color: "rgba(255,255,255,0.70)",
              lineHeight: "22px",
              fontSize: 14,
            }}
          >
            <li>Go back to the Kavyx app.</li>
            <li>Log in with the email + password you used to sign up.</li>
          </ol>

          <div style={{ marginTop: 16 }}>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                border: "1px solid rgba(255,215,0,0.35)",
                background: "rgba(255,215,0,0.10)",
                color: "#ffd700",
                padding: "12px 14px",
                borderRadius: 14,
                fontWeight: 900,
              }}
            >
              Go to kavyx.tech
            </a>
          </div>

          <p
            style={{
              marginTop: 14,
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
              lineHeight: "18px",
            }}
          >
            If you didn’t create this account, you can ignore this page.
          </p>
        </div>
      </div>
    </main>
  );
}
