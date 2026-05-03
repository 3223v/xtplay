import { NextResponse } from "next/server";

import {
  listArticles,
  readArticleData,
  writeArticleData,
  deleteArticleData,
  generateUniqueArticleId,
} from "@/app/lib/market/storage";
import { marketArticleSchema, MarketArticle } from "@/app/lib/market/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("id");

    if (articleId) {
      const article = readArticleData(articleId);
      return NextResponse.json({
        success: true,
        data: article,
      });
    }

    const articles = listArticles();
    return NextResponse.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch articles",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<MarketArticle>;
    const articleId = generateUniqueArticleId();

    const article = writeArticleData(articleId, {
      ...marketArticleSchema.parse({}),
      ...body,
      id: articleId,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    } as MarketArticle);

    return NextResponse.json({
      success: true,
      data: article,
      message: "Article created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create article",
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
          message: "Article ID is required",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<MarketArticle>;
    const existingArticle = readArticleData(articleId);

    const updatedArticle = writeArticleData(articleId, {
      ...existingArticle,
      ...body,
      id: articleId,
    } as MarketArticle);

    return NextResponse.json({
      success: true,
      data: updatedArticle,
      message: "Article updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update article",
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
          message: "Article ID is required",
        },
        { status: 400 }
      );
    }

    deleteArticleData(articleId);

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete article",
      },
      { status: 500 }
    );
  }
}