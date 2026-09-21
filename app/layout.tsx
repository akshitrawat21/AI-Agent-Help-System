import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Display serif, used only at hero scale — landing headline, footer call to
// action, sign-in titles. Everything functional stays in Geist, so data-dense
// screens keep one voice.
const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Helpdesk AI",
    template: "%s · Helpdesk AI",
  },
  description:
    "An AI support assistant that answers from your knowledge base and hands off to your team the moment it isn't sure.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f16" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The init script writes `class` and `style` on <html> before React
    // hydrates, so React must be told not to treat that as a mismatch.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Blocking on purpose: it has to run before the first paint or a
          // dark-mode visitor gets a white flash.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} font-sans`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
