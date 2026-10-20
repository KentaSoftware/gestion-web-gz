'use client'
import { Inter } from "next/font/google";
import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { useAppSelector } from '@/redux/hook';
import { getLoading } from '@/redux/loadingSlice';
import { Spinner } from '@/components/ui/spinner';
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

/** Overlay de carga global conectado al estado Redux loadingSlice */
function LoadingOverlay() {
  const loading = useAppSelector(getLoading);
  if (!loading.open) return null;
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-overlay-scrim">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-12 text-brand-primary" />
        <p className="text-center text-2xl font-bold">
          <span className="text-brand-primary">GOLO</span>
          <span className="text-brand-accent">ZUR</span>
        </p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Provider store={store}>
            <Dashboard>
              {children}
              <LoadingOverlay />
              <Toaster />
            </Dashboard>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
