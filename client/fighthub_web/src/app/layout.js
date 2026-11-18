import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const title = "Kavyx | Combat sports discovery and fight opportunities";
const description = "Find fighters, publish open fight slots, and manage applications. Kavyx connects fighters, coaches, and scouts in one mobile app.";

export const metadata = {
  title,
  description,
  applicationName: "Kavyx",
  icons: { icon: "/images/kavyx-mark.svg" },
  openGraph: { title, description, siteName: "Kavyx", type: "website" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
