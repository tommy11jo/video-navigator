import { useState } from "react"
import axios from "axios"
import { TranscriptEntry } from "./VideoPage"

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

export default TranscriptContainer