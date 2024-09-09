from fastapi import APIRouter, Depends, HTTPException
from .screenshot_service import take_screenshots
from ..video_overview.video_overview import get_video_overview
from ..video_overview.video_overview_deps import get_supabase_client

router = APIRouter()


@router.post("/take-screenshots-for-video-overview/{video_id}")
async def take_screenshots_for_video_overview(
    video_id: str, supabase=Depends(get_supabase_client)
):
    video_overview = await get_video_overview(video_id, supabase)
    if video_overview is None:
        raise HTTPException(
            status_code=404, detail=f"Video overview not found for video_id: {video_id}"
        )
    time_for_screenshots = [chapter.time_in_secs for chapter in video_overview.chapters]
    screenshot_urls = await take_screenshots(video_id, time_for_screenshots, supabase)

    supabase.table("video_overviews").update({"screenshot_urls": screenshot_urls}).eq(
        "video_id", video_id
    ).execute()

    return screenshot_urls
