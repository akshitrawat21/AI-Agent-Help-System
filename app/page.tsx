import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-16 pt-8">
          <h1 className="text-5xl font-bold text-blue-900 mb-4 text-balance">
            AI Agent Help System
          </h1>
          <p className="text-xl text-blue-700 mb-8 text-balance">
            Real-time chat support powered by AI with instant supervisor
            escalation
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/chat">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Chat
              </Button>
            </Link>
            <Link href="/supervisor/escalations">
              <Button
                size="lg"
                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Supervisor Dashboard
              </Button>
            </Link>
            <Link href="/chat">
              <Button
                size="lg"
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                Start Voice Call
              </Button>
            </Link>
            <Link href="/knowledge-base">
              <Button
                size="lg"
                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Knowledge Base
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">
                Real-Time Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-blue-600">
                Chat directly with our AI agent for instant support responses
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">
                Smart Escalation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-blue-600">
                If the AI isn't confident, conversations are automatically
                escalated to supervisors
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">
                Continuous Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-blue-600">
                Every resolved conversation improves the AI for better future
                responses
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="bg-white border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">System Overview</CardTitle>
            <CardDescription className="text-blue-600">
              Complete AI agent help system with human oversight
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <span className="font-medium text-blue-900">
                  Request Processing
                </span>
                <span className="text-sm text-green-600 font-semibold">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <span className="font-medium text-blue-900">
                  Knowledge Base
                </span>
                <span className="text-sm text-green-600 font-semibold">
                  Ready
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <span className="font-medium text-blue-900">
                  Supervisor Access
                </span>
                <span className="text-sm text-green-600 font-semibold">
                  Available
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
