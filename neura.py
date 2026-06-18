import discord
from discord.ext import commands
from core.patch import apply_32bit_patch
from config.settings import TOKEN_TAI_KHOAN_FARM
from dashboard.server import start_dashboard

print("--- KHỞI ĐỘNG HỆ THỐNG NEURA PRO ---")
apply_32bit_patch()
bot = commands.Bot(command_prefix="!", self_bot=True, chunk_guilds_at_startup=False)
bot.is_paused, bot.running = False, True

try:
    bot.load_extension("cogs.owo_core")
    print("✅ Load thành công module cogs.owo_core")
except Exception as e:
    print(f"❌ Lỗi nạp module: {e}")

if __name__ == "__main__":
    start_dashboard()
    try: bot.run(TOKEN_TAI_KHOAN_FARM)
    except discord.LoginFailure: print("❌ Lỗi: Token Discord không hợp lệ!")
