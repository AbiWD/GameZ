import { ReactNode } from 'react';
import NavBar from './NavBar';
import Footer from './Footer';

export function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-cyber-dark text-gray-100 selection:bg-cyber-purple selection:text-white font-sans">
      <NavBar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
