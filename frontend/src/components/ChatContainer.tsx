import { useMutation } from "@tanstack/react-query"
import { videoService } from "../services/video"
import ChatInput from "./ChatInput"
import ChatResponse from "./ChatResponse"

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
  const chatMutation = useMutation({
    mutationFn: ({
      question,
      userApiKey,
    }: {
      question: string
      userApiKey?: string
    }) => videoService.chatWithVideo(videoId, question, userApiKey),
  })

  const handleSubmit = (question: string) => {
    chatMutation.mutate({
      question,
      userApiKey: apiKey ?? undefined,
    })
  }

  return (
    <div className="h-full flex flex-col">
      <ChatInput onSubmit={handleSubmit} isDisabled={chatMutation.isPending} />
      <div className="flex-1 overflow-auto p-4">
        <ChatResponse
          data={chatMutation.data}
          isLoading={chatMutation.isPending}
          error={chatMutation.error}
          onCitationClick={onCitationClick}
        />
      </div>
    </div>
  )
}

export default ChatContainer
