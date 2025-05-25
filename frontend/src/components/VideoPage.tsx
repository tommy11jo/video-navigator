import { useState, useRef } from "react"
import YouTubeEmbed from "./VideoEmbed"
import { useParams } from "react-router-dom"
import axios from "axios"
import { DateTime } from "luxon"
import { useUser } from "./UserContext"
import "../styles/custom-scrollbar.css"

export interface VideoOverview {
  chapters: Chapter[]
  video_title: string
  published_iso: string
  duration_iso: string
  channel_title: string
}

export interface Chapter {
  title: string
  key_points: KeyPoint[]
  associations: string[]
}

export interface KeyPoint {
  text: string
  time: number
}

export interface TranscriptEntry {
  timestamp: string
  content: string
}

export interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}
// Container components
interface OverviewContainerProps {
  videoId: string
  currentTimeInS: number
  onKeyPointClick: (time: number) => void
}

const OverviewContainer = ({ videoId, currentTimeInS, onKeyPointClick }: OverviewContainerProps) => {
  const [videoOverview, setVideoOverview] = useState<VideoOverview | null>(null)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1)
  const [isLoaded, setIsLoaded] = useState(false)

  if (!isLoaded) {
    const fetchVideoData = async () => {
      try {
        const response = await axios.get<VideoOverview>(
          `${import.meta.env.VITE_API_URL}/get-overview/${videoId}`
        )
        setVideoOverview(response.data)
        setIsLoaded(true)
      } catch (error) {
        console.error("Error fetching video overview:", error)
        setIsLoaded(true)
      }
    }
    fetchVideoData()
    return <div className="p-4 text-gray-400 text-center">Loading video overview...</div>
  }

  if (!videoOverview || !videoOverview.chapters) {
    return <div className="p-4 text-gray-400 text-center">Failed to load video overview</div>
  }

  // Update current chapter based on time
  const chapterIndex = videoOverview.chapters.findIndex((chapter, index) => {
    const currentChapterStart = chapter.key_points[0]?.time ?? 0
    const nextChapterStart =
      videoOverview.chapters[index + 1]?.key_points[0]?.time ?? Infinity
    return (
      currentTimeInS >= currentChapterStart &&
      currentTimeInS < nextChapterStart
    )
  })
  const newChapterIndex = chapterIndex !== -1 ? chapterIndex : videoOverview.chapters.length - 1
  if (newChapterIndex !== currentChapterIndex) {
    setCurrentChapterIndex(newChapterIndex)
  }

  return (
    <div>
      {videoOverview.chapters.map((chapter: Chapter, index: number) => (
        <div
          key={index}
          className={`text-sm ${
            index === currentChapterIndex
              ? "bg-gray-800 rounded-lg"
              : ""
          }`}
        >
          <div className="p-1">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span
                className="cursor-pointer mr-2 text-blue-accent hover:underline"
                onClick={() =>
                  onKeyPointClick(chapter.key_points[0].time)
                }
              >
                {chapter.title}
              </span>
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {chapter.associations.map(
                (association: string, associationIndex: number) => (
                  <span
                    key={associationIndex}
                    className="px-2 py-1 bg-gray-700 text-white text-xs rounded-full"
                  >
                    {association}
                  </span>
                )
              )}
            </div>
            <div className="m-2">
              <ul className="list-disc pl-5">
                {chapter.key_points.map(
                  (keyPoint: KeyPoint, pointIndex: number) => (
                    <li key={pointIndex}>
                      <span
                        className="cursor-pointer text-gray-300 hover:text-white hover:underline"
                        onClick={() =>
                          onKeyPointClick(keyPoint.time)
                        }
                      >
                        {keyPoint.text}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface TranscriptContainerProps {
  videoId: string
  onTimestampClick: (timestamp: string) => void
}

const TranscriptContainer = ({ videoId, onTimestampClick }: TranscriptContainerProps) => {
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  if (!isLoaded) {
    const fetchTranscript = async () => {
      try {
        const response = await axios.get<TranscriptEntry[]>(
          `${import.meta.env.VITE_API_URL}/get-transcript/${videoId}`
        )
        setTranscript(response.data)
      } catch (error) {
        console.error("Error fetching transcript:", error)
        setTranscript([])
      } finally {
        setIsLoaded(true)
      }
    }
    fetchTranscript()
    return (
      <div className="p-4 text-gray-400 text-center">
        Loading transcript...
      </div>
    )
  }

  const groupTranscriptEntries = (entries: TranscriptEntry[]) => {
    if (!entries.length) return []

    const grouped = []
    let currentGroup = {
      timestamp: entries[0].timestamp,
      content: entries[0].content,
    }

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i]
      const currentTime = parseTimestamp(currentGroup.timestamp)
      const entryTime = parseTimestamp(entry.timestamp)

      if (entryTime - currentTime <= 10) {
        currentGroup.content += " " + entry.content
      } else {
        grouped.push(currentGroup)
        currentGroup = {
          timestamp: entry.timestamp,
          content: entry.content,
        }
      }
    }
    grouped.push(currentGroup)
    return grouped
  }

  const parseTimestamp = (timestamp: string): number => {
    const [minutes, seconds] = timestamp.split(":").map(Number)
    return minutes * 60 + seconds
  }

  return (
    <div className="p-4">
      {transcript === null || transcript.length === 0 ? (
        <div className="text-gray-400 text-center">
          Transcript not available for this video
        </div>
      ) : (
        <div className="space-y-4">
          {groupTranscriptEntries(transcript).map((group, index) => (
            <div key={index} className="flex gap-3">
              <span
                className="text-blue-accent font-mono text-sm shrink-0 cursor-pointer hover:underline"
                onClick={() => onTimestampClick(group.timestamp)}
              >
                {group.timestamp}
              </span>
              <span className="text-white text-sm leading-relaxed">
                {group.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

const VideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>()
  const { apiKey } = useUser()

  const [currentTimeInS, setCurrentTimeInS] = useState(0)
  const [seekTimeInS, setSeekTimeInS] = useState(-1)
  const [activeTab, setActiveTab] = useState<
    "overview" | "transcript" | "chat"
  >("overview")
  const [videoMetadata, setVideoMetadata] = useState<{
    video_title?: string
    channel_title?: string
    published_iso?: string
  } | null>(null)

  // Fetch metadata once on mount
  if (!videoMetadata && videoId) {
    const fetchMetadata = async () => {
      try {
        const response = await axios.get<VideoOverview>(
          `${import.meta.env.VITE_API_URL}/get-overview/${videoId}`
        )
        setVideoMetadata({
          video_title: response.data.video_title,
          channel_title: response.data.channel_title,
          published_iso: response.data.published_iso
        })
      } catch (error) {
        console.error("Error fetching video metadata:", error)
        setVideoMetadata({})
      }
    }
    fetchMetadata()
  }

  const handleKeyPointClick = (time: number) => {
    setSeekTimeInS(time)
  }


  const handleTimestampClick = (timestamp: string) => {
    const [minutes, seconds] = timestamp.split(":").map(Number)
    const timeInSeconds = minutes * 60 + seconds
    setSeekTimeInS(timeInSeconds)
  }


  const handleCitationClick = (seconds: number) => {
    setSeekTimeInS(seconds)
  }

  if (!videoId) return <div>No video ID provided</div>
  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 p-4">
        <YouTubeEmbed
          videoId={videoId!}
          setCurrentTimeInS={setCurrentTimeInS}
          seekTimeInS={seekTimeInS}
          key={videoId}
        />
        <div className="card mt-4">
          <span className="text-lg font-bold">{videoMetadata?.video_title || "Loading..."}</span>
          <div className="flex flex-row justify-between text-sm">
            {videoMetadata?.channel_title && (
              <span className="block mt-2">{videoMetadata.channel_title}</span>
            )}
            {videoMetadata?.published_iso && (
              <span className="block mt-2">
                {DateTime.fromISO(videoMetadata.published_iso).toLocaleString(
                  DateTime.DATE_FULL
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col text-sm">
            {videoId && (
              <div className="mt-2">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  See on YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-2">
        <div className="mb-4">
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "overview"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Video Overview
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "transcript"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("transcript")}
            >
              Transcript
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "chat"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
          </div>
        </div>

        <div className="overflow-auto h-[72svh] border-2 border-gray-700 rounded-lg text-sm custom-scrollbar">
          {activeTab === "overview" && (
            <OverviewContainer
              videoId={videoId}
              currentTimeInS={currentTimeInS}
              onKeyPointClick={handleKeyPointClick}
            />
          )}

          {activeTab === "transcript" && (
            <TranscriptContainer
              videoId={videoId}
              onTimestampClick={handleTimestampClick}
            />
          )}

          {activeTab === "chat" && (
            <ChatContainer
              videoId={videoId}
              apiKey={apiKey}
              onCitationClick={handleCitationClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoPage
