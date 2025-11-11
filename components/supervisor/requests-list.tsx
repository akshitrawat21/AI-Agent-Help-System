"use client";

import type { HelpRequest } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface RequestsListProps {
  requests: HelpRequest[];
  selectedRequest: HelpRequest | null;
  onSelectRequest: (request: HelpRequest) => void;
  loading: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-blue-100 text-blue-800";
    case "ai_responded":
      return "bg-yellow-100 text-yellow-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "resolved":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  return (
    status.replace("_", " ").charAt(0).toUpperCase() +
    status.slice(1).replace("_", " ")
  );
};

export function RequestsList({
  requests,
  selectedRequest,
  onSelectRequest,
  loading,
}: RequestsListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-secondary/20 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No requests found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-2">
        {requests.map((request) => (
          <Card
            key={request.id}
            className={`p-3 cursor-pointer border-2 transition-colors ${
              selectedRequest?.id === request.id
                ? "bg-primary/10 border-primary"
                : "bg-card border-border hover:border-primary/50"
            }`}
            onClick={() => onSelectRequest(request)}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {request.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {request.customer_email}
                  </p>
                </div>
                <Badge
                  className={`whitespace-nowrap text-xs ${getStatusColor(
                    request.status
                  )}`}
                >
                  {getStatusLabel(request.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {request.question}
              </p>
              <p className="text-xs text-muted-foreground">
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
              </p>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
