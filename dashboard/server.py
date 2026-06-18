from flask import Flask, render_template
from threading import Thread
import json
import os
import re

app = Flask(__name__)

def get_db_data():
    db_path = "data/database.json"
    if not os.path.exists(db_path): return {"total_hunts": 0, "total_battles": 0, "captcha_count": 0}
    try:
        with open(db_path, "r") as f: return json.load(f)
    except: return {"total_hunts": 0, "total_battles": 0, "captcha_count": 0}

def parse_discord_emojis(text):
    if not text: return "Đang chờ lượt đánh đầu tiên..."
    parsed = re.sub(r'<a?:[^:]+:(\d+)>', r'<img src="https://cdn.discordapp.com/emojis/\1.png" style="width:22px;vertical-align:middle;">', text)
    parsed = re.sub(r'<@!?\d+>', '<b>[Bạn]</b>', parsed)
    parsed = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', parsed)
    return parsed.replace('\n', '<br>')

@app.route('/')
def home():
    data = get_db_data()
    return render_template('index.html', data=data, formatted_log=parse_discord_emojis(data.get("last_log_text", "")))

def start_dashboard():
    Thread(target=lambda: app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False), daemon=True).start()
