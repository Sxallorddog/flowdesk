import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flowdesk.example"),
  title: { default: "FlowDesk — CRM для невеликих команд", template: "%s · FlowDesk" },
  description: "Клієнти, угоди, завдання й командна робота в одному спокійному CRM-просторі.",
  keywords: ["CRM", "керування клієнтами", "pipeline", "завдання", "малий бізнес"],
  openGraph: { title: "FlowDesk — не втрачайте темп", description: "CRM для невеликих команд: клієнти, угоди та завдання в одному місці.", type: "website", locale: "uk_UA", images: [{ url: "/og.png", width: 1200, height: 630, alt: "FlowDesk — CRM для команд, які ростуть" }] },
  twitter: { card: "summary_large_image", title: "FlowDesk — CRM для невеликих команд", description: "Продажі й робота команди без хаосу.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
