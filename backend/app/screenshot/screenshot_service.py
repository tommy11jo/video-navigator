from playwright.async_api import async_playwright
import asyncio
import time
import os
import uuid
from ..video_overview.video_overview_deps import get_logger

logger = get_logger()


def create_screenshot_folder():
    folder_name = "screenshots"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    return folder_name


async def take_screenshot(page, video_id, timestamp_in_secs, output_file):
    if timestamp_in_secs < 0:
        logger.error(f"Cannot take screenshot at timestamp {timestamp_in_secs}s")
        return ""
    buffer_time_in_secs = 1
    timestamp_in_secs = max(0, timestamp_in_secs - buffer_time_in_secs)
    url = f"https://www.youtube.com/watch?v={video_id}&t={timestamp_in_secs}s"
    await page.goto(url)
    player = await page.wait_for_selector("#movie_player")
    play_button = await page.wait_for_selector(".ytp-play-button", timeout=5000)
    fs_button = await page.query_selector(".ytp-fullscreen-button")

    if not player or not play_button or not fs_button:
        logger.error("Elements not found.")
        return

    time.sleep(buffer_time_in_secs)

    # TODO: Make play tooltip and scrub bar disappear
    await play_button.click()
    await fs_button.click()

    time.sleep(1)

    async def handle_ad(page):
        # assumes the video is paused
        try:
            ad_element = await page.query_selector(".ytp-preview-ad")
            if ad_element:
                # hit play button
                play_button = await page.query_selector(".ytp-play-button")
                if play_button:
                    await play_button.click()
                    logger.debug("Clicked play button to play video.")
                else:
                    logger.error("Play button not found.")
                    return False
                logger.debug(
                    f"Ad detected at timestamp {timestamp_in_secs}s. Waiting for skip button..."
                )
                skip_button = await page.query_selector(".ytp-skip-ad-button")
                if skip_button:
                    time.sleep(6)  # Unskippable ads last up to 5 seconds
                    if await skip_button.is_visible():
                        await skip_button.click()
                        logger.debug("Clicked 'Skip Ad' button.")
                    else:
                        logger.error("Skip button is not visible.")
                        return False

                    # Wait for the ad to be skipped or the skip button to change
                    start_time = time.time()
                    while time.time() - start_time < 5:  # 5 seconds for youtube to skip
                        skip_button = await page.query_selector(".ytp-skip-ad-button")
                        if not skip_button or not await skip_button.is_visible():
                            return True

                        time.sleep(0.016)
        except Exception as e:
            logger.exception(f"Error handling ad: {e}")
        return False

    # Handle multiple ads
    max_ads = 2
    for _ in range(max_ads):
        if not await handle_ad(page):
            break
    logger.debug("Taking screenshot...")
    await page.screenshot(path=output_file)
    logger.debug(f"Screenshot taken: {output_file}")


async def take_screenshots(video_id, timestamps_in_secs, supabase):
    try:
        screenshot_folder = create_screenshot_folder()
        screenshot_urls = []
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            for i, timestamp_in_secs in enumerate(timestamps_in_secs):
                output_file = os.path.join(screenshot_folder, f"screenshot_{i}.png")
                await take_screenshot(page, video_id, timestamp_in_secs, output_file)
                file_url = await upload_screenshot(
                    output_file, f"screenshot_{i}.png", supabase
                )
                screenshot_urls.append(file_url)
            await browser.close()
            return screenshot_urls

    except Exception as e:
        logger.exception(f"Error taking screenshots: {e}")
        return []


async def upload_screenshot(file_path: str, file_name: str, supabase) -> str:
    """
    Upload a screenshot to Supabase storage and return the public URL.
    """
    with open(file_path, "rb") as file:
        file_extension = os.path.splitext(file_name)[1]
        storage_file_name = f"{uuid.uuid4()}{file_extension}"
        response = supabase.storage.from_("screenshots").upload(storage_file_name, file)

    if response.status_code == 200:
        file_url = supabase.storage.from_("screenshots").get_public_url(
            storage_file_name
        )
        return file_url
    else:
        raise Exception("Failed to upload file")


async def main():
    video_id = "VMj-3S1tku0"
    timestamps = [1, 5, 10]
    screenshot_folder = create_screenshot_folder()

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        try:
            for i, timestamp in enumerate(timestamps):
                output_file = os.path.join(screenshot_folder, f"screenshot_{i}.png")
                await take_screenshot(page, video_id, timestamp, output_file)
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
