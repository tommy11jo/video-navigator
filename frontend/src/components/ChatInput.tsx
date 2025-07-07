import { useState, useRef } from "react"

interface ChatInputProps {
  onSubmit: (question: string) => void
  isDisabled: boolean
}

const ChatInput = ({ onSubmit, isDisabled }: ChatInputProps) => {
  const [question, setQuestion] = useState("")
  const questionInputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when component mounts
  if (
    questionInputRef.current &&
    document.activeElement !== questionInputRef.current
  ) {
    questionInputRef.current.focus()
  }

  const handleSubmit = () => {
    if (!question.trim() || isDisabled) return
    onSubmit(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-b border-gray-700 p-4">
      <textarea
        ref={questionInputRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask a question about this video..."
        className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg resize-none focus:outline-none focus:border-blue-accent"
        rows={3}
        disabled={isDisabled}
      />
      <div className="text-xs text-gray-400 mt-1">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}

export default ChatInput