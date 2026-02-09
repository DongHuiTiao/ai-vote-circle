import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // 删除用户 session
  cookieStore.delete('user_id');

  return NextResponse.redirect(new URL('/', request.url));
}
