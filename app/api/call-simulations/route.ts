import { createServerSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const { request_id, webhook_url, payload } = body

    if (!request_id || !webhook_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Make the webhook call
    let response_status = 500
    let response_body = { error: "Failed to reach webhook" }

    try {
      const webhookResponse = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      response_status = webhookResponse.status
      response_body = await webhookResponse.json()
    } catch (err) {
      console.error("Webhook call error:", err)
    }

    const { data, error } = await supabase
      .from("call_simulations")
      .insert([
        {
          request_id,
          webhook_url,
          payload,
          response_status,
          response_body,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create call simulation record" }, { status: 500 })
    }

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
      .from("call_simulations")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch call simulations" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
