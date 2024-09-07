import React, { useEffect, useRef } from "react"
import Plyr from "plyr"
import "plyr/dist/plyr.css"
import "../styles/plyr.css"

interface YouTubeEmbedProps {
  videoId: string
  seekTimeInS: number
  setCurrentTimeInS: (time: number) => void
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  seekTimeInS,
  setCurrentTimeInS,
}) => {
  const playerRef = useRef<Plyr | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      if (!playerRef.current) {
        console.log("Creating new player")
        playerRef.current = new Plyr(containerRef.current, {
          provider: "youtube",
          keyboard: {
            global: true,
          },
        })

        playerRef.current.on("timeupdate", () => {
          if (playerRef.current) {
            setCurrentTimeInS(playerRef.current.currentTime)
          }
        })

        // bug in plyr: seeked event doesn't trigger when video is paused, so we use the seeking event
        // workaround: after seeking, wait a bit then check the new time in the HTML
        playerRef.current.on("seeking", () => {
          if (!playerRef.current) {
            console.error("No player found")
            return
          }
          // could be problematic on different browsers which take different times to update the UI
          // con: if the user seeks again before the UI updates, the seek will be lost
          setTimeout(() => {
            setCurrentTimeInS(playerRef.current!.currentTime)
          }, 500)
        })
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, setCurrentTimeInS])

  useEffect(() => {
    if (!playerRef.current || seekTimeInS === -1) return

    // hacky workaround since seeking programatically doesn't trigger updates to the progress bar
    const updateVideoProgress = (progressPercentage: number) => {
      progressPercentage = Math.max(0, Math.min(100, progressPercentage))
      const seekInput = document.querySelector(
        'input[data-plyr="seek"]'
      ) as HTMLInputElement
      if (seekInput) {
        seekInput.value = progressPercentage.toString()
        seekInput.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        console.error("No seek input found")
        return
      }
    }
    const totalDuration = playerRef.current.duration
    const progressPercentage = (seekTimeInS / totalDuration) * 100
    updateVideoProgress(progressPercentage)
    playerRef.current.currentTime = seekTimeInS
    setCurrentTimeInS(seekTimeInS)
  }, [seekTimeInS, setCurrentTimeInS])

  return (
    <div
      ref={containerRef}
      data-plyr-provider="youtube"
      data-plyr-embed-id={videoId}
    ></div>
  )
}

export default YouTubeEmbed
