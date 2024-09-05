from playwright.sync_api import sync_playwright
import time
import os


def create_screenshot_folder():
    folder_name = "screenshots"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
        print(f"Created folder: {folder_name}")
    return folder_name


def take_screenshot(page, video_id, timestamp_in_secs, output_file):
    buffer_time_in_secs = 1
    timestamp_in_secs = max(0, timestamp_in_secs - buffer_time_in_secs)
    url = f"https://www.youtube.com/watch?v={video_id}&t={timestamp_in_secs}s"
    page.goto(url)
    player = page.wait_for_selector("#movie_player")
    play_button = page.wait_for_selector(".ytp-play-button", timeout=5000)
    fs_button = page.query_selector(".ytp-fullscreen-button")

    if not player or not play_button or not fs_button:
        print("[ERROR]: Elements not found.")
        return

    time.sleep(buffer_time_in_secs)

    # TODO: Make play tooltip and scrub bar disappear
    play_button.click()
    fs_button.click()

    time.sleep(1)

    def handle_ad():
        # assumes the video is paused
        try:
            ad_element = page.query_selector(".ytp-preview-ad")
            if ad_element:
                # hit play button
                play_button = page.query_selector(".ytp-play-button")
                if play_button:
                    play_button.click()
                    print("Clicked play button to play video.")
                else:
                    print("[ERROR]: Play button not found.")
                    return False
                print(
                    f"Ad detected at timestamp {timestamp_in_secs}s. Waiting for skip button..."
                )
                skip_button = page.query_selector(".ytp-skip-ad-button")
                if skip_button:
                    time.sleep(6)  # Unskippable ads last up to 5 seconds
                    if skip_button.is_visible():
                        skip_button.click()
                        print("Clicked 'Skip Ad' button.")
                    else:
                        print("[ERROR]: Skip button is not visible.")
                        return False

                    # Wait for the ad to be skipped or the skip button to change
                    start_time = time.time()
                    while time.time() - start_time < 5:  # 5 seconds for youtube to skip
                        skip_button = page.query_selector(".ytp-skip-ad-button")
                        if not skip_button or not skip_button.is_visible():
                            return True

                        time.sleep(0.016)
        except Exception as e:
            print(f"Error handling ad: {e}")
        return False

    # Handle multiple ads
    max_ads = 2
    for _ in range(max_ads):
        if not handle_ad():
            break
    print("Taking screenshot...")
    page.screenshot(path=output_file)
    print(f"Screenshot taken: {output_file}")


def main():
    video_id = "VMj-3S1tku0"
    timestamps = [1, 5, 10]
    screenshot_folder = create_screenshot_folder()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            for i, timestamp in enumerate(timestamps):
                output_file = os.path.join(screenshot_folder, f"screenshot_{i}.png")
                take_screenshot(page, video_id, timestamp, output_file)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
