'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-custom py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="text-3xl transform group-hover:scale-110 transition-transform">
            🕌
          </div>
          <span className="text-2xl font-display font-bold text-gradient hidden sm:inline">
            Садака
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { href: '/', label: 'Главная' },
            { href: '/about', label: 'О проекте' },
            { href: '/mosques', label: 'Мечети' },
            { href: '/contact', label: 'Контакты' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors font-medium"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button className="btn btn-ghost btn-sm">Вход</button>
            <button className="btn btn-primary btn-sm">Приложение</button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden glass border-t border-white/20 dark:border-dark-700/50 animate-fade-in-down">
          <div className="container-custom py-4 space-y-2">
            {[
              { href: '/', label: 'Главная' },
              { href: '/about', label: 'О проекте' },
              { href: '/mosques', label: 'Мечети' },
              { href: '/contact', label: 'Контакты' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 rounded-lg hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <button className="btn btn-secondary btn-sm flex-1">Вход</button>
              <button className="btn btn-primary btn-sm flex-1">Приложение</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
