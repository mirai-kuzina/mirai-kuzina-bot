import requests
import asyncio
import json
import os
import random
from config.settings import DISCORD_WEBHOOK_URL, TYPING_SPEED_WPM

DB_PATH = "data/database.json"

def load_db():
    if not os.path.exists(DB_PATH):
        return {"total_hunts": 0, "total_battles": 0, "captcha_count": 0, "gem_stats": {"hunts_since_last_gem": 0}}
    with open(DB_PATH, "r") as f:
        return json.load(f)

def update_db(key, value, subkey=None):
    data = load_db()
    if subkey:
        data[key][subkey] = value
    else:
        data[key] = value
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=4)

def trigger_termux_audio_alarm():
    try:
        os.system("termux-vibrate -d 1000") 
        os.system("termux-tts-speak 'Alert! Captcha detected!'") 
    except: pass

def send_webhook_log(msg):
    try: requests.post(DISCORD_WEBHOOK_URL, json={"content": msg}, timeout=5)
    except: pass

def trigger_direct_discord_call(token, target_user_id):
    headers = {"Authorization": token, "Content-Type": "application/json"}
    try:
        dm_url = "https://discord.com/api/v9/users/@me/channels"
        dm_response = requests.post(dm_url, headers=headers, json={"recipient_id": str(target_user_id)}, timeout=5)
        if dm_response.status_code in [200, 201]:
            channel_id = dm_response.json().get("id")
            call_url = f"https://discord.com/api/v9/channels/{channel_id}/call/ring"
            requests.post(call_url, headers=headers, json={"recipients": [str(target_user_id)]}, timeout=5)
            return True
        return False
    except: return False

async def send_stealth_message(bot, channel, text):
    if bot.is_paused or not channel: return False
    try:
        async with channel.typing():
            words = len(text.split()) if len(text) > 4 else 1
            typing_time = (words / (TYPING_SPEED_WPM / 60)) + random.uniform(0.2, 0.7)
            await asyncio.sleep(max(typing_time, 0.8))
            if bot.is_paused: return False 
            await channel.send(text)
            return True
    except: return False
