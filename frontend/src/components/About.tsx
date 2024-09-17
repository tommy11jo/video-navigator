const AboutPage = () => {
  return (
    <div className="min-h-full bg-black text-white">
      <div className="container mx-auto px-2">
        <p>
          This project demonstrates a simple but new video watching experience.
          It's useful for people trying to learn, like a student watching a
          lecture or a citizen watching the presidential debate. A core goal is
          to improve navigation for videos, to make it more intuitive for people
          to move through and make sense of information-dense videos. The main
          idea is to present a video side by side with a fine-grained
          interactive written overview. This interface supports watching,
          rewatching, skimming, getting a gist at a glance, extracting key
          points, and jumping between segments.
        </p>
        <br />
        <p>
          Right now, this is a demo, not a standalone product. My hope is for
          platforms like YouTube to incorporate a similar video interface,
          accessible via a single click or toggle. (YouTube, will you implement
          this? Dated: 9/15/24)
        </p>
        <br />
        <p>
          Besides improving the watching experience, fine-grained written
          overviews can help improve the video selection UX. Currently, a user
          is faced with a grid of videos represented by thumbnails and titles
          and they must quickly judge and select a video to watch. What if the
          user could hover over a video to see its chapters (AI-generated or
          not) and possibly its fine-grained details? A written overview is a
          key defense against attention hacking, as the current video selection
          UX makes it easy to fall prey to a catchy title/thumbnail and hard to
          quickly get a gist of a video's content.
        </p>
        <br />
        <p>
          Inspired by Bret Victor's dynamic{" "}
          <a
            className="text-blue-500"
            href="https://youtu.be/uI7J3II59lc?t=934"
            target="_blank"
          >
            poster comic strip
          </a>{" "}
          of a video.
        </p>
      </div>
    </div>
  )
}

export default AboutPage
