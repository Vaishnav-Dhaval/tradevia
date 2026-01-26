"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const { isAuthenticated, logoutMutation } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  return (
    <header className="fixed top-0 w-full px-4 py-6 md:px-8 lg:px-12 bg-[#161b22] z-50 border-b border-[#30363d]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/images/logo.png"
            alt="Tradevia Logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-xl font-semibold font-ibm-plex-mono text-[#f0f6fc]">
            tradevia
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 lg:space-x-12">
          <Link
            href="/"
            className={`hover:text-[#00d9ff] transition-colors font-instrument-sans ${pathname === "/" ? "font-bold text-[#00d9ff]" : "text-[#8b949e]"}`}
          >
            Home
          </Link>
          <Link
            href="/docs"
            className={`hover:text-[#00d9ff] transition-colors font-instrument-sans ${pathname === "/docs" ? "font-bold text-[#00d9ff]" : "text-[#8b949e]"}`}
          >
            Docs
          </Link>
          <Link
            href="/marketplace"
            className={`hover:text-[#00d9ff] transition-colors font-instrument-sans ${pathname === "/marketplace" ? "font-bold text-[#00d9ff]" : "text-[#8b949e]"}`}
          >
            Marketplace
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <button
              onClick={() => logoutMutation.mutate()}
              className="border border-[#30363d] text-[#f0f6fc] px-6 py-2 rounded-4xl transition-colors font-instrument-sans font-medium cursor-pointer hover:border-[#00d9ff] hover:text-[#00d9ff]"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] px-6 py-2 rounded-4xl hover:opacity-90 transition-all font-instrument-sans font-medium cursor-pointer"
            >
              Login
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 z-50 relative text-[#f0f6fc]"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 w-full h-full bg-[#0d1117] z-40 pt-20">
          <nav className="flex flex-col space-y-6 px-6 py-8">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${pathname === "/"
                  ? "font-bold text-[#00d9ff]"
                  : "text-[#8b949e] hover:text-[#00d9ff]"
                }`}
            >
              Home
            </Link>
            <Link
              href="/docs"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${pathname === "/docs"
                  ? "font-bold text-[#00d9ff]"
                  : "text-[#8b949e] hover:text-[#00d9ff]"
                }`}
            >
              Docs
            </Link>
            <Link
              href="/marketplace"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${pathname === "/marketplace"
                  ? "font-bold text-[#00d9ff]"
                  : "text-[#8b949e] hover:text-[#00d9ff]"
                }`}
            >
              Marketplace
            </Link>

            <div className="pt-6 border-t border-[#30363d]">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logoutMutation.mutate();
                    closeMobileMenu();
                  }}
                  className="w-full border border-[#30363d] text-[#f0f6fc] px-6 py-3 rounded-4xl transition-colors font-instrument-sans font-medium hover:border-[#00d9ff]"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="block w-full text-center bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] px-6 py-3 rounded-4xl hover:opacity-90 transition-all font-instrument-sans font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
