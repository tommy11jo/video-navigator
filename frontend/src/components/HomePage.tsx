import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import axios, { AxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useUser } from "./UserContext"
import ExampleList from "./ExampleList"

type APIKeyModalProps = {
  apiKey: string
  setApiKey: (apiKey: string) => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}
const APIKeyModal = ({
  setApiKey,
  apiKey,
  isOpen,
  setIsOpen,
}: APIKeyModalProps) => {
  const [inputValue, setInputValue] = useState(apiKey)

  useEffect(() => {
    setInputValue(apiKey)
  }, [apiKey])

  if (!isOpen) return null

  const handleSubmit = () => {
    setApiKey(inputValue)
    setIsOpen(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-black p-4 rounded-lg shadow-lg border border-gray-700">
        <span className="text-white">Set Anthropic API Key</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="bg-white text-black border border-gray-300 p-2 mt-2 mb-4 w-full rounded"
        />
        <div className="flex justify-between">
          <button
            onClick={() => setIsOpen(false)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
const HomePage = () => {
  const { user, setApiKey } = useUser()
  const [videoUrl, setVideoUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recentOverviews, setRecentOverviews] = useState<
    { videoId: string; title: string }[]
  >([])
  const inputRef = useRef<HTMLInputElement>(null)

  const staticExamples = [
    {
      videoId: "uI7J3II59lc",
      title: "Hypercard in the World, May 2016",
    },
    {
      videoId: "C27RVio2rOs",
      title: "Michael Seibel - Building Product",
    },
    {
      videoId: "VMj-3S1tku0",
      title:
        "The spelled-out intro to neural networks and backpropagation: building micrograd",
    },
    {
      videoId: "Uj6skZIxPuI",
      title:
        "David Reich – How One Small Tribe Conquered the World 70,000 Years Ago",
    },
    {
      videoId: "VgsC_aBquUE",
      title: "Full Debate: Harris vs. Trump in 2024 Presidential Debate | WSJ",
    },
    {
      videoId: "tQt_KOAWiVQ",
      title: "Simple Rules for Better Sandwiches | Techniquely with Lan Lam",
    },
  ]

  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const storedOverviews = localStorage.getItem("recentOverviews")
    if (storedOverviews) {
      setRecentOverviews(JSON.parse(storedOverviews))
    }
  }, [])

  const addRecentOverview = (videoId: string, title: string) => {
    const updatedOverviews = [
      { videoId, title },
      ...recentOverviews.filter((overview) => overview.videoId !== videoId),
    ]
    setRecentOverviews(updatedOverviews)
    localStorage.setItem("recentOverviews", JSON.stringify(updatedOverviews))
  }

  const generateOverviewMutation = useMutation({
    mutationFn: (videoId: string) =>
      axios
        .post(
          `${import.meta.env.VITE_API_URL}/generate-overview/${videoId}`,
          { user_api_key: user.apiKey },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
        .then((res) => res.data),
    onSuccess: (data, videoId) => {
      setIsGenerating(false)
      addRecentOverview(videoId, data.video_title)
      navigate(`/video/${videoId}`)
    },
    onError: (error: AxiosError) => {
      console.error("Error generating overview:", error)
      setErrorMessage(
        (error.response?.data as { detail: string })?.detail || "Unknown error"
      )
      setIsGenerating(false)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage("")
    let urlObj: URL
    try {
      urlObj = new URL(videoUrl)
    } catch (error: unknown) {
      setErrorMessage("Invalid YouTube URL. Please enter a valid URL.")
      if (error instanceof Error) {
        console.error("Invalid YouTube URL: " + error.message)
      } else {
        console.error("Invalid YouTube URL: Unknown error")
      }
      return
    }
    const params = new URLSearchParams(urlObj.search)
    const videoId = params.get("v")
    if (videoId) {
      setIsGenerating(true)
      generateOverviewMutation.mutate(videoId)
    } else {
      setErrorMessage("Invalid YouTube URL. Please enter a valid URL.")
      console.error("Invalid YouTube URL")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-1 pt-8">
        <div className="flex justify-end max-w-md mx-auto p-2">
          <button
            className="text-sm text-gray-400 hover:text-white"
            onClick={() => setIsModalOpen(true)}
          >
            Set API Key
          </button>
        </div>
        {isModalOpen && (
          <APIKeyModal
            setApiKey={setApiKey}
            apiKey={user.apiKey}
            isOpen={isModalOpen}
            setIsOpen={setIsModalOpen}
          />
        )}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter YouTube URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mb-4"
          />
          <div className="flex justify-center">
            <button
              type="submit"
              className="inline-flex items-center bg-blue-accent rounded-md px-4 py-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Get Overview"
              )}
            </button>
          </div>
          {errorMessage && (
            <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
          )}
        </form>
        <div className="mt-8 max-w-md mx-auto">
          <ExampleList title="Examples:" items={staticExamples} />
          <br />
          <ExampleList title="Recent Overviews:" items={recentOverviews} />
          <span className="text-gray-400 text-sm">
            Note: Your list of generated overviews is in local storage. It can
            be lost easily.
          </span>
        </div>
      </div>
    </div>
  )
}

export default HomePage
