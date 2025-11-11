"use client";

import type { KnowledgeBaseArticle } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface KnowledgeBaseListProps {
  articles: KnowledgeBaseArticle[];
  selectedArticle: KnowledgeBaseArticle | null;
  onSelectArticle: (article: KnowledgeBaseArticle) => void;
  loading: boolean;
}

export function KnowledgeBaseList({
  articles,
  selectedArticle,
  onSelectArticle,
  loading,
}: KnowledgeBaseListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-secondary/20 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No articles found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-2">
        {articles.map((article) => (
          <Card
            key={article.id}
            className={`p-3 cursor-pointer border-2 transition-colors ${
              selectedArticle?.id === article.id
                ? "bg-primary/10 border-primary"
                : "bg-card border-border hover:border-primary/50"
            }`}
            onClick={() => onSelectArticle(article)}
          >
            <div className="space-y-2">
              <p className="font-medium text-foreground truncate text-sm">
                {article.question}
              </p>
              <p className="text-xs text-muted-foreground">
                {article.category}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {article.answer}
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  try {
                    const date = new Date(article.createdAt);
                    return isNaN(date.getTime())
                      ? "Recently added"
                      : formatDistanceToNow(date, { addSuffix: true });
                  } catch (error) {
                    return "Recently added";
                  }
                })()}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
