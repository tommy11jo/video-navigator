import axios from "axios"
import { TranscriptEntry, VideoOverview } from "../components/VideoPage"

const API_URL = import.meta.env.VITE_API_URL

export const videoService = {
  fetchTranscript: async (videoId: string): Promise<TranscriptEntry[]> => {
    const response = await axios.get<TranscriptEntry[]>(
      `${API_URL}/get-transcript/${videoId}`
    )
    return response.data
  },

  fetchOverview: async (videoId: string): Promise<VideoOverview | null> => {
    const response = await axios.get<VideoOverview | null>(
      `${API_URL}/get-overview/${videoId}`
    )
    return response.data
  },

  generateOverview: async (
    videoId: string,
    userApiKey?: string
  ): Promise<VideoOverview> => {
    const response = await axios.post<VideoOverview>(
      `${API_URL}/generate-overview/${videoId}`,
      {
        user_api_key: userApiKey,
      }
    )
    return response.data
  },

  chatWithVideo: async (
    videoId: string,
    question: string,
    userApiKey?: string
  ): Promise<{ answer: string }> => {
    const response = await axios.post<{ answer: string }>(
      `${API_URL}/chat/${videoId}`,
      {
        question,
        user_api_key: userApiKey,
      }
    )
    return response.data
  },
}
