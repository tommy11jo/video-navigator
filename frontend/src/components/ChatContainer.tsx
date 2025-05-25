import { useState, useRef } from "react"
import axios from "axios"
import { ChatMessage } from "./VideoPage"

interface ChatContainerProps {
  videoId: string
  apiKey: string | null
  onCitationClick: (seconds: number) => void
}

const ChatContainer = ({ videoId, apiKey, onCitationClick }: ChatContainerProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when component mounts
  if (chatInputRef.current && document.activeElement !== chatInputRef.current) {
    chatInputRef.current.focus()
  }

  const handleSendMessage = async () => {
    if (!currentQuestion.trim() || !videoId || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentQuestion,
      timestamp: new Date(),
    }

    setChatMessages([userMessage])
    setCurrentQuestion("")
    setIsLoading(true)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/chat/${videoId}`,
        {
          question: currentQuestion,
          user_api_key: apiKey,
        }
      )

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.data.answer,
        timestamp: new Date(),
      }

      setChatMessages([userMessage, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorContent = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Sorry, there was an error processing your question."
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: errorContent,
        timestamp: new Date(),
      }
      setChatMessages([userMessage, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
          type: 'text',
          content: text.slice(lastIndex, match.index)
        })
      }

      parts.push({
        type: 'citation',
        content: citationCounter.toString(),
        seconds: parseInt(match[1])
      })

      citationCounter++
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      })
    }

    return parts
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {chatMessages.length === 0 ? (
          <div className="text-gray-400 text-center">
            Ask a question about this video
          </div>
        ) : (
          <>
            {chatMessages.filter(msg => msg.type === 'user').map((message) => (
              <div key={message.id} className="mb-6">
                <h3 className="text-white text-base font-medium border-b border-white pb-1 mb-4">
                  Question
                </h3>
                <div className="text-white text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            {chatMessages.filter(msg => msg.type === 'assistant').length > 0 && (
              <div>
                <h3 className="text-white text-base font-medium border-b border-white pb-1 mb-4">
                  Answer
                </h3>
                {chatMessages.filter(msg => msg.type === 'assistant').map((message) => (
                  <div key={message.id} className="text-white text-sm leading-relaxed">
                    <div className="whitespace-pre-wrap">
                      {parseCitations(message.content).map((part, index) => (
                        part.type === 'text' ? (
                          <span key={index}>{part.content}</span>
                        ) : (
                          <button
                            key={index}
                            onClick={() => onCitationClick(part.seconds!)}
                            className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs rounded-full mx-1 hover:bg-blue-600 cursor-pointer"
                            title={`Jump to ${Math.floor(part.seconds! / 60)}:${(part.seconds! % 60).toString().padStart(2, '0')}`}
                          >
                            {part.content}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {isLoading && (
          <div>
            <h3 className="text-white text-base font-medium border-b border-white pb-1 mb-4">
              Answer
            </h3>
            <div className="text-gray-400">Thinking...</div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 p-4">
        <textarea
          ref={chatInputRef}
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
    </div>
  )
}

export default ChatContainer