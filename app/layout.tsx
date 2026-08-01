import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
