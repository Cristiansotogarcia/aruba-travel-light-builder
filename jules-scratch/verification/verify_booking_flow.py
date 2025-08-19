import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_hello_world(page: Page):
    """
    This script verifies that the simplified app renders "Hello, Login!".
    """
    # --- Capture Console Logs ---
    page.on("console", lambda msg: print(f"CONSOLE: [{msg.type}] {msg.text}"))

    # --- Navigate to the login page ---
    print("Navigating to the login page...")
    page.goto("http://127.0.0.1:8080/login")

    # --- Take a screenshot for debugging ---
    print("Taking a debug screenshot of the login page...")
    page.screenshot(path="jules-scratch/verification/login_page_debug.png")
    print("Debug screenshot saved.")

    # Wait for the "Hello, Login!" text to be visible
    print("Waiting for 'Hello, Login!' text...")
    hello_text = page.get_by_text("Hello, Login!")
    expect(hello_text).to_be_visible(timeout=10000)

    print("Success! The simplified app is rendering.")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_hello_world(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
