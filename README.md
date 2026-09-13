# Lampa Kodi Bridge

Lampa plugin + webOS background bridge for opening Lampa streams in Kodi on LG webOS and applying playback tempo.

## What it does

`Lampa -> webOS Luna service -> Kodi -> Player.Open -> Player.GetActivePlayers -> Player.SetTempo`

The bridge does not hardcode Kodi `playerid`; it detects the active video player every time.

## Lampa plugin URL

Use this URL in Lampa plugins:

`https://raw.githubusercontent.com/Diffuzy/lampa-kodi-bridge/main/lampa-kodi.js`

## Requirements

- LG webOS TV
- Kodi installed on webOS
- Kodi HTTP remote control enabled
- Port `8080` (or configure another one in the plugin)
- Matching Kodi HTTP username/password configured in Lampa
- `com.custom.lampakodi.service` bridge installed on the TV

## Plugin settings

In Lampa → Settings → Kodi Bridge:

- Enable/disable opening video in Kodi
- Playback speed: `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`
- Kodi HTTP username
- Kodi HTTP password
- Kodi HTTP port

## Notes

The password is not embedded in this repository. It is entered locally in Lampa settings on the TV.

Current tested bridge version: `0.1.1`.
