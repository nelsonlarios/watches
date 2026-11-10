import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Saros — A world on your wrist",
  description:
    "A cinematic 3D journey into the Rolex Sky-Dweller. Explore the Saros annual calendar, dual time zones and Ring Command with an AI-narrated story.",
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
