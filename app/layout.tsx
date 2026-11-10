import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Saros — A little universe on your wrist",
  description:
    "A cinematic journey inside the Rolex Sky-Dweller. Discover its heartbeat, celestial calendar, and the art of travelling through time.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
