import { useState, useRef } from "react"
import axios from "axios"
import { Loader2 } from "lucide-react"

interface ChatContainerProps {
  videoId: string
  apiKey: string | null
  onCitationClick: (seconds: number) => void
}

const ChatContainer = ({
  videoId,
  apiKey,
  onCitationClick,
}: ChatContainerProps) => {
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const questionInputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when component mounts
  if (
    questionInputRef.current &&
    document.activeElement !== questionInputRef.current
  ) {
    questionInputRef.current.focus()
  }

  const handleSubmitQuestion = async () => {
    if (!currentQuestion.trim() || !videoId || isLoading) return

    const questionText = currentQuestion
    setIsLoading(true)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/chat/${videoId}`,
        {
          question: questionText,
          user_api_key: apiKey,
        }
      )

      setCurrentAnswer(response.data.answer)
    } catch (error) {
      console.error("Error sending question:", error)
      const errorContent =
        (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Sorry, there was an error processing your question."

      setCurrentAnswer(errorContent)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitQuestion()
    }
  }

  const parseCitations = (text: string) => {
    const citationRegex = /\[CITE:(\d+)(?:-\d+)?\]/g
    const parts = []
    let lastIndex = 0
    let citationCounter = 1
    let match

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        })
      }

      parts.push({
        type: "citation",
        content: citationCounter.toString(),
        seconds: parseInt(match[1]),
      })

      citationCounter++
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      })
    }

    return parts
  }

  return (
    <div className="h-full flex flex-col">
      {/* Question Input at Top */}
      <div className="border-b border-gray-700 p-4">
        <textarea
          ref={questionInputRef}
          value={currentQuestion}
          onChange={(e) => setCurrentQuestion(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question about this video..."
          className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-accent"
          rows={3}
          disabled={isLoading}
        />
        <div className="text-xs text-gray-400 mt-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      {/* Answer Below */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="text-gray-400 text-center flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Thinking...
          </div>
        )}

        {currentAnswer && !isLoading && (
          <div className="text-white text-sm leading-relaxed">
            <div className="whitespace-pre-line">
              {parseCitations(currentAnswer).map((part, index) =>
                part.type === "text" ? (
                  <span key={index}>{part.content}</span>
                ) : (
                  <button
                    key={index}
                    onClick={() => onCitationClick(part.seconds!)}
                    className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs rounded-full mx-1 hover:bg-blue-600 cursor-pointer"
                    title={`Jump to ${Math.floor(part.seconds! / 60)}:${(
                      part.seconds! % 60
                    )
                      .toString()
                      .padStart(2, "0")}`}
                  >
                    {part.content}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatContainer
