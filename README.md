# TuneX

A modern white karaoke web app built with React (no build step) and the YouTube Data + IFrame APIs.

## Run it
Open http://localhost:8080 in Chrome. The first time, paste your own YouTube Data API v3 key. It is stored only in your browser (localStorage) and is sent only to Google.

You can also host the folder on GitHub Pages (Settings > Pages > main / root).

## Get a YouTube API key

1. Open the Google Cloud Console and create a project.
2. Enable "YouTube Data API v3".
3. Create an API key (restrict it to YouTube Data API v3 and to your site).

## Good to know

- The video is locked: a transparent shield blocks touches, and all control is through TuneX buttons.
- Mic effects (echo, reverb, bass, treble) process your microphone with the Web Audio API. YouTube audio itself cannot be processed by web pages, so song key/pitch shifting and song EQ are not possible.
- Use headphones with the mic on, or the speakers will feed back.
- The sing score is just for fun: it measures how steadily you sing, not pitch accuracy.
- Best in Chrome on Android or desktop.

## 50 features

See More > "All 50 features" inside the app.
