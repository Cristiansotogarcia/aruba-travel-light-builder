import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const About: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <h1>About Us</h1>
        <p>This is the full story about our company.</p>
        <img src="https://example.cloudflare.com/about.jpg" alt="About Us" />
      </main>
      <Footer />
    </div>
  );
};

export default About;
