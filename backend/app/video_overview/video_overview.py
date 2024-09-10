from fastapi import APIRouter, Depends

from .video_overview_deps import (
    assistant,
    get_fireworks_client,
    get_openai_client,
    system,
    user,
)
from .video_overview_schemas import (
    Chapter,
    ChapterForFunctionCall,
    Quote,
    VideoOverview,
    VideoOverviewFunctionCallResponse,
    Message,
)
from typing import List, Optional
from .video_overview_deps import get_supabase_client
from fastapi import HTTPException
from .video_overview_services import (
    get_transcript,
    get_video_metadata,
    get_approximate_timestamp,
)
from .video_overview_deps import get_logger

logger = get_logger()

router = APIRouter()

testing = False
chapter_min_range = 3 if testing else 5
chapter_max_range = 5 if testing else 30


def get_video_overview_prompt(chapters: List[str]) -> List[Message]:
    chapter_dne_str = f"- Create between {chapter_min_range}-{chapter_max_range} chapters depending on the density / complexity of the transcript."

    chapters_str = "\n".join([f"{i}: {chapter}" for i, chapter in enumerate(chapters)])
    chapter_exist_str = f"- Use the following chapters: \n{chapters_str}"

    video_overview_prompt = f"""Your job is to generate a video overview given a video transcript.
The video overview should help the user understand the video contents at a glance and navigate the video while watching.
Note that the transcript is not perfect, so you may need to assume where sentences start and end.
Follow these guidelines:
{chapter_dne_str if len(chapters) == 0 else chapter_exist_str}
- Output 2-3 points per chapter. Each point should be a key detail or takeaway.
- Output 2-4 quotes per chapter. 
    - Each quote should be one sentence.
    - Each quote must be an EXACT segment from the transcript. It should match character for character.
    - Keep the punctuation as is.
    - Keep the wording and grammar as it is.
    - Keep any typos as is.
    - Keep the capitalization as is.
    - Also, do not wrap each quote in quotes.

Remember: Quotes must be taken directly from the transcript.
"""
    video_overview = VideoOverviewFunctionCallResponse(
        chapters=[
            ChapterForFunctionCall(
                title="How to Build an Minimum Viable Product (MVP)?",
                key_points=[
                    "MVP should be launched quickly and iterated based on user feedback",
                    "Avoid excessive planning and focus on getting a product to users",
                ],
                key_quotes=[
                    "The best advice is to actually launch something quickly and iterate get a product into the hands of your customers and then learn whether it helps them or doesn't and then iterate it improve it over time",
                    "You'd only really start learning about your user when you put a product in front of it",
                ],
            ),
            ChapterForFunctionCall(
                title="Pre-launch Startup Goals",
                key_points=[
                    "Focus on rapid product launch and iteration",
                    "Engage with initial customers to improve product usefulness",
                    "Embrace the iterative process of product development",
                ],
                key_quotes=[
                    "You should be talking to some initial customers and trying to figure out what you can do to make that product useful for them",
                    "More often than not after three four five six iterations your VP is going to be very different you have learned so much",
                ],
            ),
            ChapterForFunctionCall(
                title="Founders Biggest Fear",
                key_points=[
                    "Fear of negative user reactions to imperfect products is often unfounded",
                    "Early adopters are accustomed to using products that don't work perfectly",
                    "Iterative improvement is key to product development",
                ],
                key_quotes=[
                    "In most cases the people who are interested in talking to a startup are early adopters they're used to using products that don't work very well",
                    "It is bad to spend one year building your MVP because you're afraid the first customer might not like it",
                ],
            ),
            ChapterForFunctionCall(
                title="Examples - Software MVP",
                key_points=[
                    "Successful companies often start with limited functionality MVPs",
                    "MVPs are typically fast to build and appeal to a small set of users",
                    "Product iterations lead to significant improvements over time",
                ],
                key_quotes=[
                    "All of these products were fast to build they could get out of the market quickly",
                ],
            ),
            ChapterForFunctionCall(
                title="Airbnb",
                key_points=[
                    "Airbnb's initial version lacked many now-standard features",
                    "The MVP focused on a specific use case (conferences) and limited accommodation type",
                ],
                key_quotes=[
                    "There were no payments if you found a place on Airbnb you couldn't pay for it there you had to arrange for payment some other way",
                    "The first version of Airbnb only worked for conferences they would literally spin it up in a city when there was a conference when the conference was over they'd spin it down",
                ],
            ),
            ChapterForFunctionCall(
                title="Twitch",
                key_points=[
                    "Twitch started as Justin.tv with a single streamer and limited functionality",
                    "The initial version was significantly different from the current platform",
                ],
                key_quotes=[
                    "In the first version of twitch there was only one page the page that you're seeing here there's only one streamer his name is Justin",
                ],
            ),
            ChapterForFunctionCall(
                title="Stripe",
                key_points=[
                    "Stripe's MVP had limited features and manual processes",
                    "The initial version targeted a specific user group (early-stage YC startups)",
                ],
                key_quotes=[
                    "There was literally no direct apis with that bank for setting up accounts so they'd have to call the bank and every night file manual paperwork for you to get your account set up",
                ],
            ),
            ChapterForFunctionCall(
                title="Solving Hair On Fire Problem",
                key_points=[
                    "Target customers with urgent, 'hair on fire' problems",
                    "Early adopters are willing to use non-perfect solutions for significant pain points",
                ],
                key_quotes=[
                    "You want to build your first version for customers who have their hair on fire",
                    "Your customers are experts in their problem but they actually don't have all of the answers at how to solve their problem that's your job",
                    "It's far better to have a hundred people love your product than a hundred thousand who kind of like it",
                ],
            ),
            ChapterForFunctionCall(
                title="Build an MVP Quickly",
                key_points=[
                    "Set specific deadlines for MVP development",
                    "Write down and then cut features to focus on essentials",
                    "Avoid becoming overly attached to the initial MVP",
                ],
                key_quotes=[
                    "Give yourself a very specific deadline it's a lot easier to make sure that you're building something that's the minimum viable product if you give yourself two weeks or a month or a month and a half to complete it",
                    "Write down your spec if you think that there are five or ten features required in order to launch an MVP write them all down",
                ],
            ),
            ChapterForFunctionCall(
                title="Outro",
                key_points=[
                    "Focus on building strong relationships with initial customers",
                    "Embrace iterative product development based on user feedback",
                ],
                key_quotes=[
                    "It's totally okay to do things that don't scale and recruit those initial customers one at a time if you care about those customers I promise you they will talk to you",
                    "You can work with them and you can help them figure out how to solve their problems and as a result help figure out how to build a great product for them",
                ],
            ),
        ]
    )
    example_prompt = "Here is the transcript: <REDACTED transcript for 'How to Build An MVP | Startup School'>"
    example_response = video_overview.model_dump_json()
    messages = [
        system(video_overview_prompt),
        user(example_prompt),
        assistant(example_response),
    ]
    return messages


# testing video id: VMj-3S1tku0
@router.post("/generate-overview/{video_id}")
async def generate_video_overview(
    video_id: str,
    supabase=Depends(get_supabase_client),
    # model_provider: str = "fireworks",
    model_provider: str = "openai",
):
    existing_overview = await get_video_overview(video_id, supabase)
    if existing_overview:
        return existing_overview

    transcript = await get_transcript(video_id)
    transcript_text = " ".join([i.text for i in transcript.moments])

    video_metadata = get_video_metadata(video_id)
    chapters = [data.title for data in video_metadata.chapters]
    chapter_times = [data.time_in_secs for data in video_metadata.chapters]
    if testing:
        chapters = chapters[:chapter_max_range]
        chapter_times = chapter_times[:chapter_max_range]
    max_transcript_length = 20_000 if testing else 200_000
    if len(transcript_text) > max_transcript_length:
        logger.warning(
            f"transcript length is {len(transcript_text)}, truncating to {max_transcript_length}"
        )
        transcript_text = transcript_text[:max_transcript_length]

    initial_messages = get_video_overview_prompt(chapters)
    messages = [
        *initial_messages,
        user(f"Here is the transcript: \n{transcript_text}"),
    ]
    if model_provider == "openai":
        openai_client = get_openai_client()
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",  # the cheaper 4o
            # model="gpt-4o-mini",
            messages=messages,
            response_format=VideoOverviewFunctionCallResponse,
        )
        response = completion.choices[0].message.parsed
    elif model_provider == "fireworks":
        fireworks_client = get_fireworks_client()
        completion = fireworks_client.chat.completions.create(
            # model="accounts/fireworks/models/llama-v3p1-70b-instruct",
            model="accounts/fireworks/models/llama-v3p1-405b-instruct",
            response_format={
                "type": "json_object",
                "schema": VideoOverviewFunctionCallResponse.model_json_schema(),
            },
            messages=messages,
        )
        content = completion.choices[0].message.content
        response = VideoOverviewFunctionCallResponse.model_validate_json(content)
    else:
        raise ValueError(f"Invalid model: {model_provider}")

    raw_chapters = response.chapters
    video_title = video_metadata.title

    chapters: List[Chapter] = []
    for i, chapter in enumerate(raw_chapters):
        title = chapter.title
        key_points = chapter.key_points
        quotes: List[Quote] = []
        for quote in chapter.key_quotes:
            time_in_secs = get_approximate_timestamp(quote, transcript_text, transcript)
            quotes.append(Quote(text=quote, time=time_in_secs))
        time_in_secs = chapter_times[i] if len(chapter_times) > 0 else -1
        chapters.append(
            Chapter(
                title=title,
                key_points=key_points,
                key_quotes=quotes,
                time_in_secs=time_in_secs,
            )
        )

    video_overview = VideoOverview(
        video_title=video_title,
        chapters=chapters,
        published_iso=video_metadata.published_iso,
        duration_iso=video_metadata.duration_iso,
        channel_title=video_metadata.channel_title,
    )
    video_overview_dict = video_overview.model_dump()

    try:
        supabase.table("video_overviews").insert(
            {
                "video_id": video_id,
                "overview": video_overview_dict,
                "screenshot_urls": [],
            }
        ).execute()
        logger.info(f"Video overview saved for video_id: {video_id}")
    except Exception as e:
        logger.error(f"Error saving video overview: {str(e)}")

    return video_overview


@router.get("/get-overview/{video_id}")
async def get_video_overview(
    video_id: str, supabase=Depends(get_supabase_client)
) -> Optional[VideoOverview]:
    try:
        result = (
            supabase.table("video_overviews")
            .select("overview")
            .eq("video_id", video_id)
            .execute()
        )
        if result.data:
            return VideoOverview(**result.data[0]["overview"])
        else:
            return None
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving video overview: {str(e)}"
        )


@router.get("/get-transcript/{video_id}")
async def get_transcript_by_video_id(video_id: str):
    transcript = await get_transcript(video_id)
    return transcript


@router.get("/get-transcript-text/{video_id}")
async def get_transcript_text_by_video_id(video_id: str):
    transcript = await get_transcript(video_id)
    transcript_text = " ".join([i.text for i in transcript.moments])
    return transcript_text


@router.get("/get-video-metadata/{video_id}")
async def get_video_metadata_by_video_id(video_id: str):
    metadata = get_video_metadata(video_id)
    return metadata
