import * as React from "react"
import { Button } from "../components/ui/button"
import { Textarea } from "../components/ui/textarea"

export default function SharePage() {
  const [text, setText] = React.useState("")

  const handleShare = async () => {
    // TODO: Implement sharing functionality
    console.log("Sharing:", text)
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <h1 className="mb-8 text-3xl font-bold">Share Text</h1>
      <div className="space-y-4">
        <Textarea
          placeholder="Enter your text here..."
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          className="min-h-[200px]"
        />
        <Button 
          onClick={handleShare}
          className="w-full"
          disabled={!text.trim()}
        >
          Share
        </Button>
      </div>
    </div>
  )
} 