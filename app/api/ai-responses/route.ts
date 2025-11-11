import { createServerSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const { request_id, ai_response, confidence_score, knowledge_base_used } = body

    if (!request_id || !ai_response) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("ai_responses")
      .insert([
        {
          request_id,
          ai_response,
          confidence_score: confidence_score || 0,
          knowledge_base_used: knowledge_base_used || [],
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create AI response" }, { status: 500 })
    }

    // Update help request status
    await supabase.from("help_requests").update({ status: "ai_responded" }).eq("id", request_id)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const requestId = request.nextUrl.searchParams.get("request_id")

    if (!requestId) {
      return NextResponse.json({ error: "request_id query parameter required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "AI response not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
