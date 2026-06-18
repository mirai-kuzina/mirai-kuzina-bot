from discord.state import ConnectionState
from discord.settings import Settings

def apply_32bit_patch():
    old_parse_ready_supplemental = ConnectionState.parse_ready_supplemental
    def patched_parse_ready_supplemental(self, data):
        if not data: return
        try:
            data.pop('user_settings', None)
            data.pop('friend_source_flags', None)
        except: pass
        return old_parse_ready_supplemental(self, data)
    ConnectionState.parse_ready_supplemental = patched_parse_ready_supplemental

    old_settings_init = Settings.__init__
    def patched_settings_init(self, *, data, state):
        if data is None: data = {}
        if 'friend_source_flags' not in data or data['friend_source_flags'] is None:
            data['friend_source_flags'] = {'all': True, 'mutual_friends': True, 'mutual_guilds': True}
        old_settings_init(self, data=data, state=state)
    Settings.__init__ = patched_settings_init
