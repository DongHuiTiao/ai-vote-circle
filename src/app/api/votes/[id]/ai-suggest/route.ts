import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { code: -1, message: '未登录' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    // 获取投票信息
    const vote = await prisma.vote.findUnique({
      where: { id },
    });

    if (!vote) {
      return NextResponse.json(
        { code: -1, message: '投票不存在' },
        { status: 404 }
      );
    }

    // 解析投票选项
    const options = Array.isArray(vote.options) ? vote.options : [];

    if (options.length === 0) {
      return NextResponse.json(
        { code: -1, message: '投票选项不存在' },
        { status: 400 }
      );
    }

    // 构建提示词
    const message = `投票标题：${vote.title}
描述：${vote.description || '无'}
选项：${options.map((opt, idx) => `${idx}. ${opt}`).join(', ')}

请根据你的人格标签做出选择并给出理由。`;

    const actionControl = `仅输出合法 JSON 对象，不要解释。输出结构：{"choice": number|number[], "reason": string}。choice 为选项的索引（从0开始）。${vote.type === 'multiple' ? '多选时 choice 为数组' : '单选时 choice 为数字'}。reason 为投票理由（20-100字）。根据你的人格标签和价值观给出真诚的建议。`;

    // 调用 SecondMe Act API
    const actResponse = await fetch(
      `${process.env.SECONDME_API_BASE_URL}/api/secondme/act/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          actionControl,
        }),
      }
    );

    if (!actResponse.ok) {
      console.error('Act API error:', actResponse.status, await actResponse.text());
      return NextResponse.json(
        { code: -1, message: 'AI 服务暂时不可用' },
        { status: 503 }
      );
    }

    // 处理 SSE 流式响应
    const reader = actResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { code: -1, message: 'AI 服务响应异常' },
        { status: 503 }
      );
    }

    const decoder = new TextDecoder();
    let result = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0]?.delta?.content) {
                result += data.choices[0].delta.content;
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
              console.warn('Failed to parse SSE line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!result.trim()) {
      return NextResponse.json(
        { code: -1, message: 'AI 未返回有效建议' },
        { status: 503 }
      );
    }

    // 解析 AI 返回的 JSON
    let aiResult;
    try {
      // 清理可能存在的 markdown 代码块标记
      const cleanedResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      aiResult = JSON.parse(cleanedResult);
    } catch (e) {
      console.error('Failed to parse AI result:', result);
      return NextResponse.json(
        { code: -1, message: 'AI 返回格式错误' },
        { status: 503 }
      );
    }

    // 验证返回数据格式
    if (
      typeof aiResult.choice === 'undefined' ||
      typeof aiResult.reason !== 'string'
    ) {
      return NextResponse.json(
        { code: -1, message: 'AI 返回数据格式错误' },
        { status: 503 }
      );
    }

    // 验证 choice 值是否在有效范围内
    const validateChoice = (choice: any): boolean => {
      if (vote.type === 'single') {
        return (
          typeof choice === 'number' &&
          choice >= 0 &&
          choice < options.length
        );
      } else {
        return (
          Array.isArray(choice) &&
          choice.every(
            (c) => typeof c === 'number' && c >= 0 && c < options.length
          )
        );
      }
    };

    if (!validateChoice(aiResult.choice)) {
      return NextResponse.json(
        { code: -1, message: 'AI 返回的选项值无效' },
        { status: 503 }
      );
    }

    // 返回 AI 建议
    return NextResponse.json({
      code: 0,
      data: {
        choice: aiResult.choice,
        reason: aiResult.reason,
      },
    });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { code: -1, message: '生成 AI 建议失败' },
      { status: 500 }
    );
  }
}
