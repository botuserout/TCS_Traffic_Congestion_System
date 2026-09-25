import os
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8837015866:AAGkEkLK2kZaUh1e6OlrpQe1GyLX1Mun8zE")
DEFAULT_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


def get_latest_chat_id(bot_token=None):
    """Attempt to retrieve the latest chat_id from getUpdates if none configured."""
    token = bot_token or TELEGRAM_BOT_TOKEN
    try:
        url = f"https://api.telegram.org/bot{token}/getUpdates"
        res = requests.get(url, timeout=5).json()
        if res.get("ok") and res.get("result"):
            latest_update = res["result"][-1]
            if "message" in latest_update:
                return str(latest_update["message"]["chat"]["id"])
            elif "channel_post" in latest_update:
                return str(latest_update["channel_post"]["chat"]["id"])
    except Exception as e:
        print(f"⚠️ Failed to auto-fetch Telegram chat_id: {e}")
    return None


def send_telegram_message(message: str, chat_id: str = None, bot_token: str = None) -> dict:
    """Send a plain text message via Telegram Bot API."""
    token = bot_token or TELEGRAM_BOT_TOKEN
    target_chat = chat_id or DEFAULT_CHAT_ID or get_latest_chat_id(token)

    if not target_chat:
        print("⚠️ Telegram alert skipped: No chat_id configured and no recent updates found.")
        return {"ok": False, "error": "No chat_id configured"}

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        res = requests.post(url, json=payload, timeout=10)
        data = res.json()
        if data.get("ok"):
            print(f"📱 Telegram message sent to chat {target_chat}!")
        else:
            print(f"❌ Telegram message failed: {data}")
        return data
    except Exception as e:
        print(f"❌ Exception sending Telegram message: {e}")
        return {"ok": False, "error": str(e)}


def send_telegram_photo(image_path: str, caption: str, chat_id: str = None, bot_token: str = None) -> dict:
    """Upload a snapshot photo with caption via Telegram Bot sendPhoto API."""
    token = bot_token or TELEGRAM_BOT_TOKEN
    target_chat = chat_id or DEFAULT_CHAT_ID or get_latest_chat_id(token)

    if not target_chat:
        print("⚠️ Telegram photo alert skipped: No chat_id configured.")
        return {"ok": False, "error": "No chat_id configured"}

    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    
    try:
        with open(image_path, "rb") as photo_file:
            files = {"photo": photo_file}
            data = {
                "chat_id": target_chat,
                "caption": caption,
                "parse_mode": "HTML"
            }
            res = requests.post(url, data=data, files=files, timeout=15)
            result_json = res.json()
            if result_json.get("ok"):
                print(f"📸 Telegram photo alert sent to chat {target_chat}!")
            else:
                print(f"❌ Telegram photo alert failed: {result_json}")
            return result_json
    except Exception as e:
        print(f"❌ Exception sending Telegram photo: {e}")
        return {"ok": False, "error": str(e)}
