import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Loader2 } from "lucide-react"
import { TranscriptEntry } from "./VideoPage"

interface TranscriptContainerProps {
  videoId: string
  onTimestampClick: (timestamp: string) => void
  currentTimeInS: number
}

const TranscriptContainer = ({
  videoId,
  onTimestampClick,
  currentTimeInS,
}: TranscriptContainerProps) => {
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState(-1)
  const activeElementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTranscript = async () => {
      setIsLoading(true)
      setHasError(false)

      try {
        const response = await axios.get<TranscriptEntry[]>(
          `${import.meta.env.VITE_API_URL}/get-transcript/${videoId}`
        )
        setTranscript(response.data)
      } catch (error) {
        console.error("Error fetching transcript:", error)
        setTranscript(null)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTranscript()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll active element into view if it's out of view
  useEffect(() => {
    if (activeElementRef.current && currentTranscriptIndex >= 0) {
      const element = activeElementRef.current
      const container = element.closest(".overflow-auto")
      if (container) {
        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()

        // Check if element is out of view (above or below container)
        const isOutOfView =
          elementRect.top < containerRect.top ||
          elementRect.bottom > containerRect.bottom

        if (isOutOfView) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }
    }
  }, [currentTranscriptIndex])

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 text-center flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
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

  const groupedTranscript = transcript ? groupTranscriptEntries(transcript) : []

  // Find current active transcript entry
  const activeIndex = groupedTranscript.findIndex((group, index) => {
    const currentGroupTime = parseTimestamp(group.timestamp)
    const nextGroupTime = groupedTranscript[index + 1]
      ? parseTimestamp(groupedTranscript[index + 1].timestamp)
      : Infinity
    return currentTimeInS >= currentGroupTime && currentTimeInS < nextGroupTime
  })

  const newTranscriptIndex =
    activeIndex !== -1 ? activeIndex : groupedTranscript.length - 1
  if (newTranscriptIndex !== currentTranscriptIndex) {
    setCurrentTranscriptIndex(newTranscriptIndex)
  }

  return (
    <div>
      {hasError || !transcript ? (
        <div className="p-4 text-gray-400 text-center">
          Transcript not available for this video
        </div>
      ) : (
        <div>
          {groupedTranscript.map((group, index) => (
            <div
              key={index}
              ref={index === currentTranscriptIndex ? activeElementRef : null}
              className={`text-sm relative cursor-pointer hover:bg-blue-accent/20 ${
                index === currentTranscriptIndex ? "bg-blue-accent/20" : ""
              }`}
              onClick={() => onTimestampClick(group.timestamp)}
            >
              {index === currentTranscriptIndex && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-accent" />
              )}
              <div className="pl-3 pr-0 py-2">
                <div className="flex gap-3">
                  <span className="text-blue-accent font-mono text-sm shrink-0">
                    {group.timestamp}
                  </span>
                  <span className="text-white text-sm leading-relaxed">
                    {group.content}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TranscriptContainer
