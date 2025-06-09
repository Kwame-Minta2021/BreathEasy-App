
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/layout/app-layout';
import { AirQualityProvider } from '@/contexts/air-quality-context';
import { APP_NAME } from '@/lib/constants';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider
import { TooltipProvider } from '@/components/ui/tooltip'; // Import TooltipProvider

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Monitor and analyze your air quality with ${APP_NAME}.`,
};

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider> {/* TooltipProvider now wraps SidebarProvider */}
            {/* This div now handles the structural role previously in SidebarProvider */}
            <div
              style={
                {
                  "--sidebar-width": SIDEBAR_WIDTH,
                  "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
                  "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                } as React.CSSProperties
              }
              className="group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar"
            >
              <SidebarProvider>
                <AirQualityProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                </AirQualityProvider>
              </SidebarProvider>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
