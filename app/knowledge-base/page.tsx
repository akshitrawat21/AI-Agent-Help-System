"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KnowledgeBaseList } from "@/components/knowledge-base/kb-list";
import { KnowledgeBaseForm } from "@/components/knowledge-base/kb-form";
import type { KnowledgeBaseArticle } from "@/lib/types";

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeBaseArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] =
    useState<KnowledgeBaseArticle | null>(null);

  useEffect(() => {
    fetchArticles();
  }, [searchTerm, selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      let url = "/api/knowledge-base";
      const params = new URLSearchParams();

      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (selectedCategory) {
        params.append("category", selectedCategory);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleCreated = () => {
    setShowForm(false);
    setEditingArticle(null);
    fetchArticles();
  };

  const handleEdit = (article: KnowledgeBaseArticle) => {
    setEditingArticle(article);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchArticles();
        if (selectedArticle?.id === id) {
          setSelectedArticle(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete article:", error);
    }
  };

  const categories = Array.from(
    new Set(articles.map((a) => a.category).filter(Boolean))
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Knowledge Base
          </h1>
          <p className="text-blue-700 mb-6">
            Manage articles and build the AI agent's knowledge base
          </p>
          <Button
            onClick={() => {
              setEditingArticle(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showForm && !editingArticle ? "Cancel" : "Add New Article"}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8">
            <KnowledgeBaseForm
              article={editingArticle || undefined}
              onSuccess={handleArticleCreated}
              onCancel={() => {
                setShowForm(false);
                setEditingArticle(null);
              }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Total Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {articles.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {categories.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                High Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {articles.filter((a) => a.confidence >= 0.8).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border h-full">
              <CardHeader>
                <CardTitle>Articles</CardTitle>
                <CardDescription>Browse and manage articles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background"
                />

                {/* Category Filter */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        selectedCategory === null ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(null)}
                    >
                      All
                    </Badge>
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant={
                          selectedCategory === category ? "default" : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Articles List */}
                <KnowledgeBaseList
                  articles={articles}
                  selectedArticle={selectedArticle}
                  onSelectArticle={setSelectedArticle}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedArticle ? (
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">
                          {selectedArticle.question}
                        </CardTitle>
                        <CardDescription>
                          {selectedArticle.category}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(selectedArticle)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(selectedArticle.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Answer
                      </p>
                      <div className="bg-secondary/10 p-4 rounded border border-border">
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                          {selectedArticle.answer}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Confidence
                      </p>
                      <Badge
                        variant={
                          selectedArticle.confidence >= 0.8
                            ? "default"
                            : "secondary"
                        }
                      >
                        {Math.round(selectedArticle.confidence * 100)}%
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground pt-4">
                      Created{" "}
                      {new Date(selectedArticle.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-card border-border h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Select an article to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
