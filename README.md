# Real Estate Video Maker

Create professional property tour videos from your photos — **completely free**, runs entirely in your browser, nothing is uploaded to any server.

## ✨ Features

- **Ken Burns Effect** - Smooth zoom and pan animations on each photo
- **Crossfade Transitions** - Professional fade transitions between clips
- **Text Overlays** - Add property addresses, prices, and descriptions
- **Background Audio** - Add music or narration to your videos
- **Multiple Resolutions** - From 720p HD to 4K UHD
- **100% Private** - All processing happens in your browser using WebAssembly
- **No Server Required** - No uploads, no data collection, complete privacy

## 🚀 Live Demo

Visit [your-github-username.github.io/real-estate-video-maker](https://your-github-username.github.io/real-estate-video-maker) to try it out!

## 📦 How to Use

1. **Upload your property photos** - Drag & drop or click to browse
2. **Customize settings**:
   - Duration per image (2-10 seconds)
   - Transition duration (0.2-2 seconds)
   - Output resolution (720p to 4K)
   - Optional: text overlay and background audio
3. **Click "Generate Video"** - Wait for processing (first load may take a minute)
4. **Download your video** - Ready to share on social media, property sites, or email

## 🔧 Technical Details

This application uses:
- **FFmpeg.wasm** - WebAssembly port of FFmpeg for client-side video processing
- **Vanilla JavaScript** - No frameworks, lightweight and fast
- **CSS Grid & Flexbox** - Responsive design for desktop and mobile

### Browser Requirements

- Modern browser with WebAssembly support (Chrome 66+, Firefox 52+, Safari 11+, Edge 79+)
- Approximately 500MB free memory for 4K video processing
- First load downloads ~30MB of FFmpeg core files (cached thereafter)

## 🏗️ Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/real-estate-video-maker.git
cd real-estate-video-maker

# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

## 🌐 Deployment to GitHub Pages

1. **Create a GitHub repository** named `real-estate-video-maker` (or your preferred name)
2. **Push these files** to the repository
3. **Go to Settings → Pages**
4. **Select source**: `main` branch (or `master`)
5. **Save** - Your site will be live at `https://your-username.github.io/real-estate-video-maker/`

### Custom Domain (Optional)

1. Add a `CNAME` file with your domain: `www.yourdomain.com`
2. Configure DNS to point to GitHub Pages
3. Enable HTTPS in GitHub Pages settings

## 📄 Files Included

```
real-estate-video-maker/
├── index.html          # Main application
├── styles.css          # (Optional) Separate styles if preferred
├── script.js           # (Optional) Separate script if preferred
└── README.md           # This file
```

Note: The single-file `index.html` includes all CSS and JS inline for simplicity.

## ⚠️ Performance Notes

- **First load**: FFmpeg.wasm needs to download ~30MB. Subsequent loads are faster (cached).
- **Processing time**: 
  - 720p: ~30 seconds for 10 images
  - 1080p: ~60 seconds for 10 images
  - 4K: ~180 seconds for 10 images
- **Memory**: Chrome is recommended for best performance. 4K videos may require 1GB+ RAM.
- **Mobile**: Works on mobile browsers but may be slower due to limited processing power.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or request features via Issues
- Submit pull requests for improvements
- Share feedback and suggestions

## 📄 License

MIT License - Free to use for personal and commercial projects.

## 💬 Support

For questions or issues:
- Check the browser console for error messages
- Try refreshing the page if FFmpeg fails to load
- Clear browser cache if experiencing issues

---

**Built with ❤️ for real estate professionals**

No servers. No uploads. No costs. Just professional property videos.