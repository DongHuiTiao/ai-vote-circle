'use client';

import Link from 'next/link';
import { HomeIcon, UserIcon, LogInIcon, LogOutIcon, PlusCircleIcon, MenuIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CreateVoteDialog } from './CreateVoteDialog';
import { useLoginPrompt } from '@/contexts/LoginPromptContext';

interface UserInfo {
  id: string;
  nickname: string | null;
  avatar: string | null;
  secondmeUserId: string;
}

export function Navbar() {
  const pathname = usePathname();
  const { showLoginPrompt } = useLoginPrompt();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 关闭移动菜单处理
  const closeMobileMenu = () => setMobileMenuOpen(false);

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
    <>
      <nav className="bg-white border-b border-gray-200 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 第一层：Logo + 用户操作区 */}
        <div className="flex items-center justify-between h-16">
          {/* Logo / 返回按钮 */}
          {/^\/votes\/[^/]+$/.test(pathname) ? (
            // 详情页：移动端显示返回按钮，桌面端显示 Logo
            <>
              <Link href="/votes" className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 rounded-lg py-2 px-3 transition-colors md:hidden">
                <HomeIcon className="w-5 h-5" />
                <span className="font-medium">返回投票大厅</span>
              </Link>
              <Link href="/" className="hidden md:flex flex-col" onClick={() => closeMobileMenu}>
                <div className="flex items-center gap-2">
                  <img src="/favicon-32x32.ico" alt="AI投票圈" className="w-8 h-8" />
                  <span className="font-bold text-xl text-gray-900">AI投票圈</span>
                </div>
                <span className="text-xs text-gray-500 mt-0.5">让 AI 帮你收集 1000 个观点</span>
              </Link>
            </>
          ) : (
            // 其他页面：显示 Logo
            <Link href="/" className="flex flex-col" onClick={() => closeMobileMenu}>
              <div className="flex items-center gap-2">
                <img src="/favicon-32x32.ico" alt="AI投票圈" className="w-8 h-8" />
                <span className="font-bold text-xl text-gray-900">AI投票圈</span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5">让 AI 帮你收集 1000 个观点</span>
            </Link>
          )}

          {/* Desktop: User Actions - 右上角登录/用户信息 */}
          <div className="hidden md:flex items-center gap-3">
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
                  onClick={() => showLoginPrompt()}
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

          {/* Mobile: 汉堡菜单按钮 + 发起投票按钮 */}
          <div className="flex items-center gap-2 md:hidden">
            {/* 发起投票按钮 */}
            <button
              onClick={() => user ? setIsCreateDialogOpen(true) : showLoginPrompt()}
              className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
              aria-label="发起投票"
            >
              <PlusCircleIcon className="w-5 h-5" />
            </button>

            {/* 汉堡菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <XIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <MenuIcon className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - 优化版 */}
        {mobileMenuOpen && (
          <>
            {/* 遮罩层 - 添加淡入动画 */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
              onClick={closeMobileMenu}
            />

            {/* 菜单内容 - 从右侧滑入，玻璃态效果 */}
            <div className="md:hidden fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white/95 backdrop-blur-md shadow-2xl z-50 animate-in slide-in-from-right duration-300 ease-out flex flex-col">
              {/* 头部：关闭按钮 + 标题 */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <img src="/favicon-32x32.ico" alt="AI投票圈" className="w-6 h-6" />
                  <span className="font-bold text-lg text-gray-900">菜单</span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="关闭菜单"
                >
                  <XIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* 滚动内容区 */}
              <div className="flex-1 overflow-y-auto py-6 px-4">
                {!loading && (
                  <div className="space-y-6">
                    {/* 用户信息区 */}
                    {user ? (
                      <>
                        <div>
                          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">账号</p>
                          <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.nickname || '用户'}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                                  <span className="text-white text-base font-semibold">
                                    {user.nickname?.[0] || user.secondmeUserId[0]}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {user.nickname || '用户'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  已登录
                                </p>
                              </div>
                            </div>
                            <a
                              href="/api/auth/logout"
                              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white py-3 rounded-xl transition-all duration-200 cursor-pointer font-medium"
                            >
                              <LogOutIcon className="w-4 h-4" />
                              登出
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">账号</p>
                        <a
                          href="/api/auth/login"
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 cursor-pointer"
                        >
                          <LogInIcon className="w-5 h-5" />
                          登录 / 注册
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 第二层：根据页面显示不同内容 (Desktop only) */}
        <div className="hidden md:block">
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
                {user ? (
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
                ) : (
                  <button
                    onClick={() => showLoginPrompt()}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      pathname === '/profile'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    个人中心
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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

    </nav>

    {/* 移动端底部导航栏 */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        <Link
          href="/votes"
          className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
            pathname === '/votes' || pathname === '/'
              ? 'text-primary-600'
              : 'text-gray-500'
          }`}
        >
          <HomeIcon className="w-6 h-6" />
          <span className="text-xs font-medium">投票大厅</span>
        </Link>
        {user ? (
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
              pathname === '/profile'
                ? 'text-primary-600'
                : 'text-gray-500'
            }`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-xs font-medium">个人中心</span>
          </Link>
        ) : (
          <button
            onClick={() => showLoginPrompt()}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 ${
              pathname === '/profile'
                ? 'text-primary-600'
                : 'text-gray-500'
            }`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-xs font-medium">个人中心</span>
          </button>
        )}
      </div>
    </div>
    </>
  );
}
