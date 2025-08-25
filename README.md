# 🌸 Web Novel Translator

A React-based web application for translating Japanese web novels into English EPUBs using Google's Gemini AI.

## ⚠️ **IMPORTANT DISCLAIMER**

This tool is **ONLY** intended for translating web novels that:
- Have had their official light novel series **axed/discontinued** 
- Are **NOT officially licensed** in English
- Are freely available on public web novel platforms

### Why I Created This

I was 3 volumes deep into "The Villainess Finally Enters Senior High" when the light novel series got axed. I desperately wanted to know what happens next! The web novel was freely available online, so I created this tool to translate it for my personal reading.

**I am not responsible for how you use this tool.** Please respect copyright laws and only use this for personal reading of unlicensed content. If a series gets officially licensed, please support the official release!

## 🌐 Supported Sites

Currently supports **only one site** (I honestly grabbed the first Japanese web novel site I found and hoped it wasn't a piracy site 😅). 

More sites may be added in the future if there's demand and they host legitimate, freely available content.

## 🔒 Privacy & Availability

- This tool is currently **publicly available**
- If you have concerns about usage or need it taken private, **feel free to contact me** - I'm happy to discuss and accommodate reasonable requests
- All translation happens through your own Google Gemini API key

## 🚀 How to Use

### Prerequisites
1. Get a free **Google Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Find a Japanese web novel URL from the supported site

### Basic Steps
1. **Enter your Gemini API key** (stored locally in your browser)
2. **Paste the series URL** (should auto-detect series name)
3. **Set chapter range** (start chapter and number of chapters to translate)
4. **Click "Start Translation"** and wait for the magic ✨

## ✨ Features

### 📚 **Smart Glossary System**
- **Progressive Character Analysis**: Generates character glossaries in 10-chapter segments
- **Context Building**: Each segment uses previous segments as context to track character development
- **Character Details**: Tracks names, ages, relationships, importance levels, and occurrence counts
- **Editable**: Add, edit, or delete characters and entire segments
- **Translation Integration**: Automatically includes glossary context in chapter translations

### 📖 **Professional EPUB Generation**
- **Beautiful Title Page**: Clean design with series info and chapter count
- **Table of Contents**: Organized by chapter groups with clickable links
- **Navigation**: Each chapter includes "Back to Contents" and "Glossary" buttons
- **Character Glossary**: Included at the end of the EPUB for reference

### 🛑 **Translation Controls**
- **Stop Mid-Translation**: Halt translation process while keeping completed chapters
- **Progress Tracking**: Real-time progress updates and status messages
- **Error Handling**: Robust retry mechanisms for API rate limits
- **Chapter Preview**: Review translations before downloading

## 📋 Recommended Usage Workflow

1. **🎯 Set Up Your Range**
   - Choose a reasonable chapter range (10-50 chapters work well)
   - Set your glossary range (same or broader than translation range)

2. **📚 Generate Glossary First**
   - Click "Generate Glossary" and wait for all segments to complete
   - Review and edit character information as needed
   - Delete any unwanted segments to clean up context

3. **🚀 Translate Chapters**
   - Click "Start Translation" with your glossary ready
   - Monitor progress and use "Stop Translation" if needed
   - Each chapter will include glossary context for better consistency

4. **✏️ Review & Edit**
   - Use the chapter preview to review translations
   - Edit any chapters that need improvement
   - Check character names are consistent throughout

5. **📖 Download & Enjoy**
   - Click "Download EPUB" to get your finished book
   - Open in your favorite e-reader (Calibre, Apple Books, etc.)
   - Enjoy reading the continuation of your favorite series! 🎉

## 🤖 Technical Notes

**Full Transparency**: This entire application was created using AI assistance (Claude + Cursor). I'm not hiding that fact - it's AI-generated code through and through. The tool works, but keep that in mind regarding code quality and potential quirks.

### Architecture
- **Frontend**: React + TypeScript + Vite
- **AI Service**: Google Gemini API with `urlContext` for web scraping
- **EPUB Generation**: Custom implementation using JSZip
- **Storage**: Local browser storage (nothing sent to external servers except Gemini API)

### Models Supported
- `gemini-1.5-flash` (recommended - faster, cheaper)
- `gemini-1.5-pro` (slower but potentially higher quality)
- `gemini-2.5-pro` (experimental, has strict rate limits)

## ⚙️ Development

```bash
cd web-novel-translator-react
npm install
npm run dev
```

## 📝 License

MIT License - Use responsibly and respect copyright laws.

---

**Remember**: This tool is for personal use with unlicensed content only. Support official releases when available! 💙