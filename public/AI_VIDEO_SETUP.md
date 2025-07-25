# AI Video Setup Instructions

## Required Video File
To enable the AI avatar video feature in the Interview component, you need to:

1. **Download the video from**: https://youtu.be/1bdKVv5iyEQ
   - Use a YouTube downloader like: https://yt-dlp.org/ or online tools
   - Or use browser extensions to download the video
2. **Convert it to MP4 format** (if not already MP4)
3. **Place the video file in this public folder as**: `ai-avatar.mp4`

## How to Download:

### Method 1: Using yt-dlp (Recommended)
```bash
# Install yt-dlp
pip install yt-dlp

# Download the video
yt-dlp -f "best[height<=720]" -o "ai-avatar.%(ext)s" https://youtu.be/1bdKVv5iyEQ

# Move the downloaded file to public folder
```

### Method 2: Online YouTube Downloaders
- Visit: https://ytmp3.cc/ or https://y2mate.com/
- Paste the URL: https://youtu.be/1bdKVv5iyEQ
- Download as MP4 format
- Rename to `ai-avatar.mp4`
- Place in the `public` folder

### Method 3: Browser Extension
- Install "Video DownloadHelper" or similar extension
- Visit the YouTube video
- Use the extension to download

## Alternative: Use a different video
If you want to use a different video:
1. Place your video file in the `public` folder
2. Name it `ai-avatar.mp4` OR update the src path in `Interview.tsx` line ~1118

## Current Issue
⚠️ **YouTube URLs cannot be used directly in HTML video elements**
- YouTube URLs (https://youtu.be/...) are webpage links, not video files
- HTML `<video>` elements need direct video file URLs (.mp4, .webm)
- YouTube protects their content from direct embedding

## How it works
- Video plays automatically when AI starts speaking a question
- Video pauses and resets when AI finishes speaking
- Same video plays for all job roles/domains
- Video is muted by default but can be unmuted using the control button
- Smooth transition between video and AI bot icon

## Video Requirements
- **Format**: MP4 (recommended) or WebM
- **Duration**: Any length (it loops automatically)
- **Size**: Keep under 50MB for optimal loading
- **Resolution**: 720p or higher recommended

## Current Status
❌ **Video file not found**: Please download and add `ai-avatar.mp4` to the public folder to enable this feature.

Without the video file, the AI will still work normally but only show the bot icon (no video animation).
