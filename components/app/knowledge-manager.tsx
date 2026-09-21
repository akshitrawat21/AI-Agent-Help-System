"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KB_CATEGORIES } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Article = {
  id: string;
  question: string;
  answer: string;
  category: string;
  source: string;
  useCount: number;
  updatedAt: string;
};

export function KnowledgeManager({
  initial,
  canEdit,
}: {
  initial: Article[];
  canEdit: boolean;
}) {
  const [articles, setArticles] = useState(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Article | null>(null);

  const load = async (query: string, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (cat !== "All") params.set("category", cat);

    const response = await fetch(`/api/knowledge?${params}`);
    const payload = await response.json();
    setArticles(payload.articles ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => load(search, category), search ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const remove = async (article: Article) => {
    const response = await fetch(`/api/knowledge/${article.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Couldn't delete that article");
      return;
    }

    setArticles((current) =>
      current.filter((item) => item.id !== article.id)
    );
    setDeleting(null);
    toast.success("Article deleted");
  };

  const categories = ["All", ...KB_CATEGORIES];
  const learnedCount = articles.filter((a) => a.source === "learned").length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions and answers"
              className="pl-8.5"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={() => setCreating(true)} className="shrink-0">
              <Plus className="size-4" />
              New article
            </Button>
          )}
        </div>

        {learnedCount > 0 && (
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            {learnedCount} of these were learned from answers your team gave.
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading && articles.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={search || category !== "All" ? "No matches" : "No articles yet"}
              description={
                search || category !== "All"
                  ? "Try a different search or category."
                  : "Add what your team already answers over and over. The assistant only answers from what's here."
              }
              action={
                canEdit && !search && category === "All" ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus className="size-3.5" />
                    Add your first article
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="stagger divide-y divide-border">
              {articles.map((article) => (
                <li
                  key={article.id}
                  className="group flex items-start gap-4 p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-medium">
                        {article.question}
                      </p>
                      {article.source === "learned" && (
                        <Badge variant="primary">
                          <Sparkles className="size-2.5" />
                          Learned
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      {article.answer}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      <Badge variant="outline">{article.category}</Badge>
                      <span className="tabular text-[11px] text-muted-foreground">
                        used {article.useCount}×
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(article.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div
                      className={cn(
                        "flex shrink-0 gap-1 transition-opacity",
                        "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(article)}
                        aria-label={`Edit "${article.question}"`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(article)}
                        aria-label={`Delete "${article.question}"`}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ArticleDialog
        open={creating || Boolean(editing)}
        article={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          load(search, category);
        }}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              The assistant will stop being able to answer “{deleting?.question}”
              and will escalate it to your team instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ArticleDialog({
  open,
  article,
  onClose,
  onSaved,
}: {
  open: boolean;
  article: Article | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Refill the form whenever the dialog opens for a different article.
  useEffect(() => {
    if (!open) return;
    setQuestion(article?.question ?? "");
    setAnswer(article?.answer ?? "");
    setCategory(article?.category ?? "General");
    setErrors({});
  }, [open, article]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    const response = await fetch(
      article ? `/api/knowledge/${article.id}` : "/api/knowledge",
      {
        method: article ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, category }),
      }
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrors(payload.errors ?? { form: payload.error ?? "Couldn't save" });
      setBusy(false);
      return;
    }

    setBusy(false);
    toast.success(article ? "Article updated" : "Article added");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>
              {article ? "Edit article" : "New article"}
            </DialogTitle>
            <DialogDescription>
              Write the answer exactly as you'd want a visitor to read it — the
              assistant delivers it verbatim on the built-in engine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            {errors.form && (
              <p className="text-[12.5px] text-destructive">{errors.form}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What are your business hours?"
                aria-invalid={Boolean(errors.question)}
                required
                autoFocus
              />
              {errors.question && (
                <p className="text-[12px] text-destructive">{errors.question}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="We're open Monday to Friday, 9am to 6pm Eastern."
                className="min-h-28"
                aria-invalid={Boolean(errors.answer)}
                required
              />
              {errors.answer && (
                <p className="text-[12px] text-destructive">{errors.answer}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KB_CATEGORIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {article ? "Save changes" : "Add article"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
