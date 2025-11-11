"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface HelpRequest {
  id: string;
  customer_id: string;
  question: string;
  status: string;
  created_at: string;
  help_request_history?: Array<{
    agent_response: string;
    supervisor_approval: boolean;
  }>;
}

interface HelpRequestCardProps {
  request: HelpRequest;
  onAction?: (id: string) => void;
  actionLabel?: string;
}

export function HelpRequestCard({
  request,
  onAction,
  actionLabel = "Review",
}: HelpRequestCardProps) {
  const statusColors: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    resolved:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    unresolved: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    escalated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const lastHistory = request.help_request_history?.[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">
              {request.question}
            </CardTitle>
            <CardDescription className="mt-2">
              {request.customer_id} •{" "}
              {(() => {
                try {
                  const date = new Date(request.created_at);
                  return isNaN(date.getTime())
                    ? "Recently created"
                    : formatDistanceToNow(date, { addSuffix: true });
                } catch (error) {
                  return "Recently created";
                }
              })()}
            </CardDescription>
          </div>
          <Badge
            className={
              statusColors[request.status] || "bg-gray-100 text-gray-800"
            }
          >
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      {lastHistory && (
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Agent Response:
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {lastHistory.agent_response}
            </p>
          </div>
          {onAction && (
            <Button
              onClick={() => onAction(request.id)}
              variant="default"
              size="sm"
              className="w-full mt-2"
            >
              {actionLabel}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
