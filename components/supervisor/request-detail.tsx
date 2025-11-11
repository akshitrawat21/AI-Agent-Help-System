"use client"

import { useState, useEffect } from "react"
import type { HelpRequest, AIResponse, SupervisorApproval } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface RequestDetailProps {
  request: HelpRequest
  onRequestUpdated: () => void
}

export function RequestDetail({ request, onRequestUpdated }: RequestDetailProps) {
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [supervisorApproval, setSupervisorApproval] = useState<SupervisorApproval | null>(null)
  const [feedback, setFeedback] = useState("")
  const [editedResponse, setEditedResponse] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processError, setProcessError] = useState("")

  useEffect(() => {
    fetchDetails()
  }, [request.id])

  const fetchDetails = async () => {
    try {
      setLoading(true)
      setProcessError("")

      // Fetch AI response
      const aiRes = await fetch(`/api/ai-responses?request_id=${request.id}`)
      if (aiRes.ok) {
        const data = await aiRes.json()
        setAiResponse(data)
        setEditedResponse(data.ai_response)
      }

      // Fetch supervisor approval if exists
      const approvalRes = await fetch(`/api/supervisor-approvals?request_id=${request.id}`)
      if (approvalRes.ok) {
        const data = await approvalRes.json()
        setSupervisorApproval(data)
        setFeedback(data.feedback || "")
      }
    } catch (error) {
      console.error("Failed to fetch details:", error)
      setProcessError("Failed to load request details")
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRequest = async () => {
    try {
      setSubmitting(true)
      setProcessError("")

      const response = await fetch("/api/process-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
        }),
      })

      if (response.ok) {
        await fetchDetails()
      } else {
        setProcessError("Failed to process request")
      }
    } catch (error) {
      console.error("Failed to process request:", error)
      setProcessError("An error occurred while processing the request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!aiResponse) return

    try {
      setSubmitting(true)
      const response = await fetch("/api/supervisor-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          supervisor_id: "supervisor-1", // TODO: Replace with actual supervisor ID from auth
          approved: true,
          feedback: feedback || null,
          approved_response: editedResponse !== aiResponse.ai_response ? editedResponse : null,
        }),
      })

      if (response.ok) {
        onRequestUpdated()
      }
    } catch (error) {
      console.error("Failed to approve request:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    try {
      setSubmitting(true)
      const response = await fetch("/api/supervisor-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          supervisor_id: "supervisor-1", // TODO: Replace with actual supervisor ID from auth
          approved: false,
          feedback: feedback || null,
        }),
      })

      if (response.ok) {
        onRequestUpdated()
      }
    } catch (error) {
      console.error("Failed to reject request:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-secondary/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isReviewed = supervisorApproval !== null
  const showApprovalButtons = !isReviewed && aiResponse
  const needsProcessing = request.status === "pending"

  return (
    <div className="space-y-4">
      {/* Customer Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            <p className="font-medium text-foreground">{request.customer_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="font-medium text-foreground">{request.customer_email}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge className="w-fit">{request.status.replace("_", " ").toUpperCase()}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Customer Question */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Customer Question</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{request.question}</p>
        </CardContent>
      </Card>

      {/* Generate AI Response Button */}
      {needsProcessing && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg">Generate AI Response</CardTitle>
            <CardDescription>Process this request with the AI agent</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleProcessRequest} disabled={submitting} className="w-full">
              {submitting ? "Processing..." : "Generate AI Response"}
            </Button>
            {processError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-200 text-sm">
                {processError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Response */}
      {aiResponse && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">AI Response</CardTitle>
            <CardDescription>Confidence: {(aiResponse.confidence_score * 100).toFixed(0)}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Original Response</p>
              <div className="bg-secondary/10 p-3 rounded border border-border">
                <p className="text-foreground whitespace-pre-wrap text-sm">{aiResponse.ai_response}</p>
              </div>
            </div>

            {showApprovalButtons && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Edit Response (Optional)</p>
                <Textarea
                  value={editedResponse}
                  onChange={(e) => setEditedResponse(e.target.value)}
                  placeholder="Edit or enhance the response before approval..."
                  className="min-h-24"
                />
              </div>
            )}

            {aiResponse.knowledge_base_used && aiResponse.knowledge_base_used.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Knowledge Base Articles Used</p>
                <div className="flex flex-wrap gap-2">
                  {aiResponse.knowledge_base_used.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supervisor Feedback */}
      {!isReviewed && aiResponse && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Supervisor Feedback</CardTitle>
            <CardDescription>Provide feedback on the AI response (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add any feedback or notes..."
              className="min-h-24"
            />
          </CardContent>
        </Card>
      )}

      {/* Approval Status */}
      {isReviewed && supervisorApproval && (
        <Card className={`bg-card border-2 ${supervisorApproval.approved ? "border-green-500" : "border-red-500"}`}>
          <CardHeader>
            <CardTitle className="text-lg">{supervisorApproval.approved ? "Approved" : "Rejected"}</CardTitle>
            <CardDescription>Reviewed by {supervisorApproval.supervisor_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {supervisorApproval.feedback && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Feedback</p>
                <p className="text-foreground">{supervisorApproval.feedback}</p>
              </div>
            )}
            {supervisorApproval.approved_response && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Approved Response</p>
                <div className="bg-secondary/10 p-3 rounded border border-border">
                  <p className="text-foreground text-sm whitespace-pre-wrap">{supervisorApproval.approved_response}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {showApprovalButtons && (
        <div className="flex gap-3">
          <Button onClick={handleApprove} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
            {submitting ? "Processing..." : "Approve"}
          </Button>
          <Button onClick={handleReject} disabled={submitting} variant="destructive" className="flex-1">
            {submitting ? "Processing..." : "Reject"}
          </Button>
        </div>
      )}
    </div>
  )
}
