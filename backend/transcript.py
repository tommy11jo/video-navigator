from youtube_transcript_api import YouTubeTranscriptApi

video_id = "VMj-3S1tku0"
transcript = YouTubeTranscriptApi.get_transcript(video_id)
total_text = " ".join([i["text"] for i in transcript])
print(total_text)
print("number words: ", len(total_text.split()))
print("number chars: ", len(total_text))
print("initial text: ", total_text[:1000])
