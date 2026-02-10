'use client';

import Link from 'next/link';
import { HomeIcon, UserIcon, LogInIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserInfo {
  id: string;
  nickname: string | null;
  avatar: string | null;
  secondmeUserId: string;
}

export function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-bold text-xl text-gray-900">AI投票圈</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/votes"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <HomeIcon className="w-4 h-4" />
              投票大厅
            </Link>
          </div>

          {/* User Actions - 右上角登录/用户信息 */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <>
                {/* 已登录：显示头像和昵称 */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-lg py-2 px-3 transition-colors"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.nickname || '用户'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.nickname?.[0] || user.secondmeUserId[0]}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {user.nickname || '用户'}
                  </span>
                </Link>
                <a
                  href="/api/auth/logout"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  登出
                </a>
              </>
            ) : (
              <>
                {/* 未登录：显示登录按钮 */}
                <a
                  href="/api/auth/login"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <LogInIcon className="w-4 h-4" />
                  登录
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
