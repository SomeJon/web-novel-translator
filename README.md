# Web Novel Translator

🌐 **Live App:** [https://SomeJon.github.io/web-novel-translator](https://SomeJon.github.io/web-novel-translator)

A modern web application that translates Japanese web novels from [ncode.syosetu.com](https://ncode.syosetu.com/) into English and generates downloadable EPUB files using Google's Gemini AI.

## ✨ Features

- 🤖 **AI-Powered Translation** - Uses Google Gemini 2.5 Flash for high-quality translations
- 📚 **EPUB Generation** - Creates properly formatted ebooks with chapters and line breaks
- 🔄 **Fresh AI Instances** - Each chapter gets a completely independent AI instance to prevent cross-contamination
- 📖 **Chapter Preview** - View any translated chapter before downloading
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🎯 **Progress Tracking** - Visual progress bar and status updates
- 🔒 **Secure** - API keys are never stored or saved
- ⚡ **Rate Limiting** - Built-in delays to respect API limits
- 🔁 **Error Recovery** - Automatic retry logic for failed translations

## 🚀 How to Use

1. **Visit the App** - Go to [https://SomeJon.github.io/web-novel-translator](https://SomeJon.github.io/web-novel-translator)

2. **Enter Your Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Provide Series URL** - Paste a Syosetu novel URL (e.g., `https://ncode.syosetu.com/n5547eo`)

4. **Configure Translation**:
   - Starting chapter number
   - Number of chapters to translate
   - Output EPUB filename

5. **Translate** - Click "Translate" and watch the progress

6. **Preview Chapters** - Use the dropdown to view any translated chapter

7. **Download EPUB** - Click "Download EPUB" when ready

## 🎯 Supported Sites

Currently supports:
- **ncode.syosetu.com** - Japan's largest web novel platform

## 🔧 Technical Features

### Translation Quality
- **Context-Aware Translation** - Uses URL context for consistent character names and terminology
- **Proper Formatting** - Maintains dialogue structure, italics for thoughts, and scene breaks
- **Clean Output** - Removes citations, footnotes, and extraneous content

### EPUB Generation
- **HTML Formatting** - Converts text to proper HTML with paragraph breaks
- **Chapter Organization** - Automatically extracts titles and organizes content
- **Reader-Friendly** - Optimized spacing and typography for ebook readers

### Technical Architecture
- **React + TypeScript** - Modern frontend framework with type safety
- **Vite** - Fast build tool and development server
- **Fresh AI Instances** - Each chapter translation uses an independent AI instance
- **Client-Side Processing** - No server required, runs entirely in the browser

## 🛠️ Development

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/SomeJon/web-novel-translator.git

# Navigate to the React app
cd web-novel-translator/web-novel-translator-react

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build and Deploy
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## 📦 Dependencies

### Core
- **React 19** - UI framework
- **TypeScript** - Type safety
- **@google/genai** - Gemini AI integration
- **jEpub** - EPUB generation

### Development
- **Vite** - Build tool
- **ESLint** - Code linting
- **gh-pages** - GitHub Pages deployment

## 🎨 UI Features

- **Modern Design** - Clean, professional interface
- **Progress Visualization** - Real-time progress bar and status updates
- **Chapter Management** - Dropdown selector for viewing translated chapters
- **Responsive Layout** - Adapts to different screen sizes
- **Error Handling** - Clear error messages and retry mechanisms

## 🔒 Privacy & Security

- **No Data Storage** - API keys and translations are never saved
- **Client-Side Only** - All processing happens in your browser
- **No Server** - Direct API calls to Google Gemini
- **Fresh Sessions** - Each chapter translation starts with a clean AI instance

## 📚 Translation Quality

The app uses a carefully crafted prompt that ensures:
- **Consistent Character Names** - Maintains character name consistency across chapters
- **Proper Dialogue Formatting** - Double quotes for speech, italics for thoughts
- **Scene Break Handling** - Converts Japanese scene breaks to standard `***` format
- **Clean Prose** - Removes web page artifacts and maintains book-like formatting
- **Double-Spaced Paragraphs** - Follows proper novel formatting conventions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Potential Improvements
- Support for additional web novel sites
- Multiple output formats (PDF, TXT)
- Translation memory/glossary features
- Batch processing of multiple series
- Custom formatting options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for personal use only. Please respect copyright laws and the terms of service of the websites you're translating from. Always check if translation and distribution are permitted by the original authors.

## 🙏 Acknowledgments

- **Google Gemini** - For providing excellent AI translation capabilities
- **Syosetu** - For hosting amazing web novels
- **React Community** - For the excellent development framework
- **jEpub Library** - For client-side EPUB generation
