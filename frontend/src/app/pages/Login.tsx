import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogIn } from "lucide-react";

import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/recommendations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-grow bg-[#F7F6F1] py-12">
      <div className="max-w-md mx-auto px-4">
        <section className="bg-white border border-[#D9DED7] rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#173F35] text-[#FFF3D8] flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#173F35]">로그인</h1>
              <p className="text-sm text-[#6B726D]">상권 추천 서비스를 계속 이용하세요.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-[#17211D]">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9DED7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C99728]"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#17211D]">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9DED7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C99728]"
                placeholder="8자 이상"
                required
              />
            </label>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#173F35] text-white py-3 rounded-xl font-bold hover:bg-[#0f2c25] disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="text-sm text-[#6B726D] mt-6 text-center">
            아직 계정이 없나요?{" "}
            <Link to="/register" className="font-bold text-[#C99728]">
              회원가입
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

