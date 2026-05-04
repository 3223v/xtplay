import { NextResponse } from "next/server";

import {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/app/lib/market/public-storage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("id");

    if (articleId) {
      const article = getArticleById(articleId);
      if (!article) {
        return NextResponse.json(
          { success: false, message: "文章不存在" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: article,
      });
    }

    const articles = getAllArticles();
    return NextResponse.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "获取文章失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const article = createArticle(body);

    return NextResponse.json({
      success: true,
      data: article,
      message: "文章创建成功",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建文章失败",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("id");

    if (!articleId) {
      return NextResponse.json(
        {
          success: false,
          message: "文章ID是必需的",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as any;
    const updatedArticle = updateArticle(articleId, body);

    if (!updatedArticle) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedArticle,
      message: "文章更新成功",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "更新文章失败",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("id");

    if (!articleId) {
      return NextResponse.json(
        {
          success: false,
          message: "文章ID是必需的",
        },
        { status: 400 }
      );
    }

    const success = deleteArticle(articleId);

    if (!success) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "文章删除成功",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "删除文章失败",
      },
      { status: 500 }
    );
  }
}