import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ code: -1, message: '未登录' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/secondme/user/shades`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    apiLogger.error('获取 Shades 信息失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: -1, message: '获取 Shades 信息失败' },
      { status: 500 }
    );
  }
}
