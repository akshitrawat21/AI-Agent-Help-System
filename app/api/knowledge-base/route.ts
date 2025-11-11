import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { question, answer, category } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        question,
        answer,
        category: category || "general",
        confidence: 0.8,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Knowledge base POST error:", error);
    // Return error but with proper message
    const message =
      error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Can't reach database")) {
      return NextResponse.json(
        {
          error:
            "Database connection failed. Please check your database server.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchTerm = request.nextUrl.searchParams.get("search");
    const category = request.nextUrl.searchParams.get("category");

    console.log(
      "Knowledge base GET - searchTerm:",
      searchTerm,
      "category:",
      category
    );

    const articles = await prisma.knowledgeBase.findMany({
      where: {
        ...(category && { category }),
        ...(searchTerm && {
          OR: [
            { question: { contains: searchTerm, mode: "insensitive" } },
            { answer: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    console.log("Knowledge base GET - found articles:", articles.length);
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Knowledge base GET error:", error);
    // Return empty array if database is down
    return NextResponse.json([]);
  }
}
