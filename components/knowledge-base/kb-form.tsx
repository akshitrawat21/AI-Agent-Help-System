"use client"

import type React from "react"

import { useState } from "react"
import type { KnowledgeBaseArticle } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface KnowledgeBaseFormProps {
  article?: KnowledgeBaseArticle
  onSuccess: () => void
  onCancel: () => void
}

export function KnowledgeBaseForm({ article, onSuccess, onCancel }: KnowledgeBaseFormProps) {
  const [question, setQuestion] = useState(article?.question || "")
  const [answer, setAnswer] = useState(article?.answer || "")
  const [category, setCategory] = useState(article?.category || "general")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!question || !answer) {
      setError("Question and answer are required")
      return
    }

    try {
      setLoading(true)

      const payload = {
        question,
        answer,
        category,
      }

      const url = article ? `/api/knowledge-base/${article.id}` : "/api/knowledge-base"
      const method = article ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to save article")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>{article ? "Edit Article" : "Create New Article"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Question</label>
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Common question"
              disabled={loading}
              className="bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <Input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Billing, Technical Support"
              disabled={loading}
              className="bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Answer</label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer to the question"
              disabled={loading}
              className="min-h-32 bg-background"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : article ? "Update Article" : "Create Article"}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              disabled={loading}
              variant="outline"
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
