import type { Metadata } from "next";
import { Inter, Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; 
import AutoLogout from "./components/AutoLogout";   

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Happy Toddles - Personalized Tutoring",
  description:
    "Empower your child's learning journey with expert tutors and interactive tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${inter.variable} ${quicksand.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-background text-on-background">
        {/* Wrap children inside Providers */}
        <Providers>
          {/* Background 10-minute idle tracker */}
          <AutoLogout />
          {children}
        </Providers>
      </body>
    </html>
  );
}