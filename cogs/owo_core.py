import discord
from discord.ext import commands
import time
import random
import asyncio
import re
from config.settings import *
from utils.helpers import send_webhook_log, trigger_direct_discord_call, send_stealth_message, trigger_termux_audio_alarm, load_db, update_db

class OwOCore(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.hunt_count = 0  
        self.current_channel_index = 0
        self.waiting_for_inv = False
        self.waiting_for_info = False   
        self.target_hunt_count = 50 

    @commands.Cog.listener()
    async def on_ready(self):
        db = load_db()
        print(f"🌟 ENGINE STARTED | Lịch sử Hunt: {db['total_hunts']}")
        self.bot.loop.create_task(self.core_farm_scheduler())
        self.bot.loop.create_task(self.background_long_cooldown_scheduler())

    async def check_and_stop_for_captcha(self, message):
        if not message or self.bot.is_paused: return
        if message.author.id == 408785106942115842:
            content = message.content.lower() if message.content else ""
            if "captcha" in content or "banned" in content or "verify" in content or "http" in content:
                self.bot.is_paused = True  
                db = load_db()
                update_db("captcha_count", db["captcha_count"] + 1)
                send_webhook_log(f"🚨 <@{YOUR_USER_ID}> **CAPTCHA!**")
                trigger_direct_discord_call(TOKEN_TAI_KHOAN_FARM, YOUR_USER_ID)
                trigger_termux_audio_alarm()

    @commands.Cog.listener()
    async def on_message(self, message):
        if not self.bot.running: return
        if message.author.id == YOUR_USER_ID and message.content.strip().lower() == "go":
            self.bot.is_paused = False
            return
        await self.check_and_stop_for_captcha(message)

        if message.author.id == 408785106942115842:
            content = message.content
            if str(YOUR_USER_ID) in content or self.bot.user.name in content:
                if any(x in content.lower() for x in ["earned", "won", "lost", "caught", "found"]):
                    img_url = message.attachments[0].url if message.attachments else ""
                    update_db("last_log_text", content)
                    update_db("last_log_image", img_url)

            if self.waiting_for_info and message.embeds and "info" in str(message.embeds[0].author.name).lower():
                self.waiting_for_info = False
                uses = re.findall(r'(\d+)\s*uses? left', message.embeds[0].description.lower() if message.embeds[0].description else "")
                if uses: self.target_hunt_count = max(1, min([int(u) for u in uses]) - 1)

            if self.waiting_for_inv and "inventory" in re.sub(r'<[^>]+>', '', content).lower():
                self.waiting_for_inv = False
                found_gems = re.findall(r'`(?:id|🌟)?\s*(\d+)`', re.sub(r'<[^>]+>', '', content))
                gems_to_use = [int(g) for g in found_gems if int(g) not in BANNED_GEM_IDS and int(g) in PRIORITY_GEM_IDS]
                if gems_to_use:
                    await send_stealth_message(self.bot, message.channel, f"owo use { ' '.join(map(str, list(set(gems_to_use))[:3])) }")
                    await asyncio.sleep(2)
                self.waiting_for_info = True
                await send_stealth_message(self.bot, message.channel, "owo info")

    async def core_farm_scheduler(self):
        await self.bot.wait_until_ready()
        init_chan = self.bot.get_channel(FARM_CHANNEL_IDS[0])
        self.waiting_for_inv = True
        await send_stealth_message(self.bot, init_chan, "owoinv")
            
        while self.bot.running:
            if self.bot.is_paused: await asyncio.sleep(1); continue
            chan = self.bot.get_channel(FARM_CHANNEL_IDS[self.current_channel_index])
            
            if await send_stealth_message(self.bot, chan, "owoh"):
                db = load_db(); update_db("total_hunts", db["total_hunts"] + 1)
                self.hunt_count += 1
            await asyncio.sleep(random.uniform(MIN_DELAY_BETWEEN_ACTIONS, 2.5))
            
            if await send_stealth_message(self.bot, chan, "owob"):
                db = load_db(); update_db("total_battles", db["total_battles"] + 1)

            if self.hunt_count >= self.target_hunt_count:
                self.waiting_for_inv = True
                await send_stealth_message(self.bot, chan, "owoinv")
                self.hunt_count = 0 
                self.current_channel_index = (self.current_channel_index + 1) % len(FARM_CHANNEL_IDS)
            await asyncio.sleep(random.uniform(15.1, 16.8))

    async def background_long_cooldown_scheduler(self):
        await self.bot.wait_until_ready()
        while self.bot.running:
            if self.bot.is_paused: await asyncio.sleep(2); continue
            chan = self.bot.get_channel(FARM_CHANNEL_IDS[self.current_channel_index])
            for cmd in LONG_COOLDOWN_COMMANDS:
                await send_stealth_message(self.bot, chan, cmd)
                await asyncio.sleep(random.uniform(2.0, 3.5))
            await asyncio.sleep(random.randint(302, 318))

def setup(bot):
    bot.add_cog(OwOCore(bot))
