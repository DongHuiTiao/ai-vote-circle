import { cookies } from 'next/headers';

// 管理员会话数据结构
interface AdminSession {
  isLoggedIn: boolean;
  loginTime: number;
}

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/**
 * 验证管理员凭证
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('[AdminAuth] 管理员凭证未配置');
    return false;
  }

  return username === adminUsername && password === adminPassword;
}

/**
 * 创建管理员会话
 */
export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  const session: AdminSession = {
    isLoggedIn: true,
    loginTime: Date.now(),
  };

  // 使用简单的方式存储会话（生产环境建议用 JWT + Redis）
  const sessionValue = Buffer.from(JSON.stringify(session)).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/admin',
  });
}

/**
 * 验证管理员会话
 */
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return false;
  }

  try {
    const session: AdminSession = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    // 检查会话是否有效（7天内）
    const now = Date.now();
    const sessionAge = now - session.loginTime;
    const maxAge = SESSION_MAX_AGE * 1000;

    if (sessionAge > maxAge) {
      // 会话过期，删除 cookie
      await clearAdminSession();
      return false;
    }

    return session.isLoggedIn === true;
  } catch (error) {
    console.error('[AdminAuth] 会话验证失败:', error);
    return false;
  }
}

/**
 * 清除管理员会话
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 中间件：要求管理员权限
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await verifyAdminSession();

  if (!isAdmin) {
    throw new Error('UNAUTHORIZED');
  }
}
