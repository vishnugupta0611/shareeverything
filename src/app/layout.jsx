import Navbar from "../components/Navbar";
import { ThemeProvider } from "../contexts/ThemeContext";
import FuturisticBackground from "../components/FuturisticBackground";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "FrequentShare - Secure P2P File Sharing",
  description: "Share files instantly without login. Secure peer-to-peer file transfer using WebRTC.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <div className="min-h-screen transition-all duration-500">
            <FuturisticBackground />
            <div className="relative z-10">
              <Navbar />
              <main>{children}</main>
            </div>
            <Toaster 
              position="top-right" 
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: 'rgba(17, 24, 39, 0.9)',
                  color: '#fff',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  backdropFilter: 'blur(10px)'
                }
              }}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}