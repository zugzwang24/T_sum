import { Link, useLocation } from "react-router";
import { Menu, Store, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  const navLinks = [
    { name: "서비스 소개", path: "/" },
    { name: "추천받기", path: "/recommendations" },
    { name: "저장함", path: "/saved" },
    { name: "상권 비교", path: "/compare" },
    { name: "분석 방법", path: "/#how-it-works" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#D9DED7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#173F35] flex items-center justify-center">
                <Store className="w-5 h-5 text-[#FFF3D8]" />
              </div>
              <span className="font-bold text-xl text-[#173F35]">황금을 찾아라</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-[#2F7565] ${
                  isActive(link.path) ? "text-[#173F35] font-bold" : "text-[#6B726D]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-semibold text-[#173F35] max-w-40 truncate">
                  {user?.name || user?.email}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="border border-[#D9DED7] text-[#17211D] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#F7F6F1] transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[#173F35] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#F7F6F1] transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="bg-[#C99728] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#b08423] transition-colors shadow-sm"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#17211D] hover:text-[#2F7565] focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#D9DED7]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.path)
                    ? "text-[#173F35] bg-[#F7F6F1]"
                    : "text-[#6B726D] hover:text-[#2F7565] hover:bg-gray-50"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/recommendations"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-center mt-4 bg-[#C99728] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#b08423] transition-colors"
            >
              추천 시작하기
            </Link>
            {!isLoading && (
              isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-center mt-2 border border-[#D9DED7] text-[#17211D] px-5 py-2 rounded-full text-sm font-semibold"
                >
                  로그아웃
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center border border-[#D9DED7] text-[#173F35] px-4 py-2 rounded-full text-sm font-semibold"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center bg-[#173F35] text-white px-4 py-2 rounded-full text-sm font-semibold"
                  >
                    회원가입
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
