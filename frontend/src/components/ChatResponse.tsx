import { Loader2 } from "lucide-react"

interface ChatResponseProps {
  data?: { answer: string }
  isLoading: boolean
  error?: Error | null
  onCitationClick: (seconds: number) => void
}

const ChatResponse = ({ data, isLoading, error, onCitationClick }: ChatResponseProps) => {
  const parseCitations = (text: string) => {
    const citationRegex = /\[CITE:(\d+(?:\.\d+)?)\]/g
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
        seconds: parseFloat(match[1]),
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

  if (error) {
    return (
      <div className="text-red-400 text-sm p-2">
        Error sending question
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-gray-400 text-center flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Thinking...
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="text-white text-sm leading-relaxed">
      <div className="whitespace-pre-line">
        {parseCitations(data.answer).map((part, index) =>
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
  )
}

export default ChatResponse