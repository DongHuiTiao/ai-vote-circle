'use client';

import Link from 'next/link';
import { HomeIcon, UserIcon, LogInIcon, LogOutIcon, PlusCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CreateVoteDialog } from './CreateVoteDialog';

interface UserInfo {
  id: string;
  nickname: string | null;
  avatar: string | null;
  secondmeUserId: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
    <nav className="bg-white border-b border-gray-200 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 第一层：Logo + 用户操作区 */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex flex-col">
            <div className="flex items-center gap-2">
              <img src="/favicon-32x32.ico" alt="AI投票圈" className="w-8 h-8" />
              <span className="font-bold text-xl text-gray-900">AI投票圈</span>
            </div>
            <span className="text-xs text-gray-500 mt-0.5">让 AI 帮你收集 1000 个观点</span>
          </Link>

          {/* User Actions - 右上角登录/用户信息 */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <>
                {/* 已登录：发起投票按钮 */}
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  发起投票
                </button>
                {/* 头像和昵称 */}
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
                {/* 登出按钮 */}
                <a
                  href="/api/auth/logout"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <LogOutIcon className="w-4 h-4" />
                  登出
                </a>
              </>
            ) : (
              <>
                {/* 未登录：发起投票按钮 */}
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  发起投票
                </button>
                {/* 登录按钮 */}
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

        {/* 第二层：根据页面显示不同内容 */}
        {/^\/votes\/[^/]+$/.test(pathname) ? (
          // 投票详情页：显示返回按钮，居左
          <div className="flex justify-start items-center py-3 border-t border-gray-100">
            <Link
              href="/votes"
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            >
              <HomeIcon className="w-4 h-4" />
              返回投票大厅
            </Link>
          </div>
        ) : (
          // 其他页面：显示导航链接，居中
          <div className="flex justify-center items-center py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Link
                href="/votes"
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  pathname === '/votes' || pathname === '/'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                投票大厅
              </Link>
              <Link
                href="/profile"
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  pathname === '/profile'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                个人中心
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 创建投票弹窗 */}
      <CreateVoteDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          // 可以在这里刷新投票列表
          window.location.reload();
        }}
      />

      {/* 登录提示弹窗 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogInIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">需要登录</h3>
              <p className="text-gray-600 mb-6">
                需要用 SecondMe 账号登录后，才可以发起投票
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  取消
                </button>
                <a
                  href="/api/auth/login"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-center"
                >
                  去登录
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
