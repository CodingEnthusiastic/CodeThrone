// Alternative YouTube Embed Version (Not Recommended)
// This is just for reference - the current video approach is better

{/* YouTube Embed Alternative - Replace the video element with this if needed */}
{isAISpeaking ? (
  <iframe
    src="https://www.youtube.com/embed/1bdKVv5iyEQ?autoplay=1&mute=1&loop=1&playlist=1bdKVv5iyEQ&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1"
    className="w-full h-full object-cover transition-opacity duration-300"
    allow="autoplay; encrypted-media"
    allowFullScreen={false}
    style={{ border: 'none' }}
  />
) : (
  // AI Bot Icon when not speaking
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
      <Bot className="h-16 w-16 text-white" />
    </div>
  </div>
)}

/* 
ISSUES WITH YOUTUBE EMBED:
1. Requires internet connection
2. May have autoplay restrictions 
3. Less control over video behavior
4. YouTube branding/controls may show
5. Performance impact
6. CORS/security restrictions
*/
