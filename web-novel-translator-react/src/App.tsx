import { useState } from 'react';
import './index.css';
import {
    GoogleGenAI,
  } from '@google/genai';


function App() {
    const [geminiApiKey, setGeminiApiKey] = useState<string>('');
    const [site, setSite] = useState<string>('syosetu');
    const [seriesUrl, setSeriesUrl] = useState<string>('');
    const [startChapter, setStartChapter] = useState<number>(1);
    const [numChapters, setNumChapters] = useState<number>(1);
    const [outputFileName, setOutputFileName] = useState<string>('translated_novel');
    const [status, setStatus] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [translatedChapters, setTranslatedChapters] = useState<Array<{ chapterNumber: number; translatedText: string }>>([]);
    const [translationProgress, setTranslationProgress] = useState<number>(0); // 0-100
    // const [previewText, setPreviewText] = useState<string>(''); // Removed - using chapter selector instead
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null); // For chapter selector

    const handleTranslate = async () => {
        if (!geminiApiKey) {
            setStatus('Please enter your Gemini API Key.');
            return;
        }

        if (!seriesUrl) {
            setStatus('Please enter the series URL.');
            return;
        }

        setIsTranslating(true);
        setTranslatedChapters([]);
        setStatus('Starting translation...');
        setTranslationProgress(0);

        const newTranslatedChapters: Array<{ chapterNumber: number; translatedText: string }> = [];

        const seriesIdMatch = seriesUrl.match(/ncode\.syosetu\.com\/(n\d+[a-zA-Z]+)/);
        const seriesIdentifier = seriesIdMatch && seriesIdMatch[1] ? seriesIdMatch[1] : seriesUrl; // Use series ID or full URL as fallback

        for (let i = 0; i < numChapters; i++) {
            const chapterNumber = startChapter + i;
            let chapterUrl;

            if (site === 'syosetu') {
                const baseUrl = seriesUrl.endsWith('/') ? seriesUrl.slice(0, -1) : seriesUrl;
                chapterUrl = `${baseUrl}/${chapterNumber}/`;
            } else {
                setStatus(`Error: Unsupported site selected: ${site}`);
                setIsTranslating(false);
                return;
            }

            setStatus(`Translating chapter ${chapterNumber}, ${i + 1}/${numChapters} for series ${seriesIdentifier}...`);
            try {
                const translatedText = await callGeminiApi(geminiApiKey, chapterUrl);
                newTranslatedChapters.push({ chapterNumber, translatedText });
                setTranslationProgress(Math.round(((i + 1) / numChapters) * 100));
                // Preview text now handled by chapter selector
            } catch (error: any) {
                setStatus(`Error translating chapter ${chapterNumber}: ${error.message}`);
                console.error(`Error translating chapter ${chapterNumber}:`, error);
                setIsTranslating(false);
                setTranslationProgress(0);
                return;
            }
            // Add a delay between API calls to avoid hitting rate limits
            if (i < numChapters - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
            }
        }

        setTranslatedChapters(newTranslatedChapters);
        setStatus('All chapters translated. Ready to download EPUB.');
        setIsTranslating(false);
    };

    // Independent translation function that creates a completely fresh AI instance for each chapter
    const translateSingleChapter = async (apiKey: string, chapterUrl: string): Promise<string> => {
        // Create a completely fresh AI instance for this chapter only
        let ai: any = null;
        let response: any = null;
        
        try {
            console.log(`🔄 Creating fresh AI instance for: ${chapterUrl}`);
            
            // Fresh AI instance - no history, no state, no memory
            ai = new GoogleGenAI({
                apiKey: apiKey
            });

            // Fresh configuration for this chapter only - completely isolated
            const tools = [{ urlContext: {} }];
            const systemPrompt = `You are an expert translator and typesetter specializing in web novels. Your task is to translate the web novel chapter from the provided URL into English, following a very strict set of rules for both content and formatting.

**CRITICAL INSTRUCTION: CLEAN OUTPUT**
Your final output must be completely clean prose. It is absolutely forbidden to include any form of in-line citation markers like \`[1]\`, source numbers, footnotes, or any other annotations within the translated text. The text must appear as it would in a published book. You must also remove any extraneous text from the source page, such as "Sources," "help," or the original Japanese title at the end of the text.

**Core Instructions:**

1.  **Use URL for Context:** Analyze the source page for character names, specific terms, and narrative tone to ensure a consistent and accurate translation.
2.  **Translate Only, No Chatter:** Your entire output must be *only* the final translated chapter as per the format below. Do not add any introductory phrases, summaries, or conversation.
3.  **Final Review Step:** Before providing the final output, review your own generated text one last time to ensure you have perfectly followed all content and formatting rules and have removed every single citation marker and all extra footer text.

**Required Output Format:**

*   **Line 1:** The translated chapter title, followed by the chapter number formatted as \`[chapter: X]\`.
    *   **Example:** \`The Crimson Contract [chapter: 214]\`
*   **Body:** The full, translated text of the chapter's body, formatted according to the detailed rules below.
*   **Final Line:** The original source URL that was provided for translation.

---
**Detailed Formatting Rules for the Chapter Body:**

1.  **Paragraph Spacing:** Separate every paragraph with a single blank line (i.e., double-spaced). This includes lines of dialogue. This is the most important formatting rule.
2.  **Dialogue:** Enclose all spoken dialogue in double quotation marks (\`"..."\`). Every change in speaker must begin on a new, separate paragraph.
3.  **Internal Thoughts:** When a character is thinking to themselves (internal monologue), format their thoughts in *italics*.
4.  **Scene Breaks:** If the original text uses a line of symbols (like \`………\` or \`* * *\`) to indicate a break in the scene, replace it with a clean, centered \`***\` on its own line, with blank lines above and below it.
---

**Constraint:**
*   Do not include the name of the web novel anywhere in your output (except for the URL at the very end).

Now, please process the following URL:`;

            const config = {
                tools,
                systemInstruction: [{ text: systemPrompt }],
            };

            const contents = [{
                role: 'user',
                parts: [{ text: chapterUrl }],
            }];

            console.log(`📤 Sending isolated request for: ${chapterUrl}`);

            // Make the API call with completely fresh instance
            response = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                config,
                contents,
            });

            // Extract text from response
            let fullText = '';
            for await (const chunk of response) {
                if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
                    const chunkText = chunk.candidates[0].content.parts.map((part: any) => part.text).join('');
                    fullText += chunkText;
                }
            }

            console.log(`✅ Translation completed for ${chapterUrl}. Length: ${fullText.length}`);
            
            return fullText;

        } catch (error) {
            console.error(`❌ Fresh translation failed for ${chapterUrl}:`, error);
            throw error;
        } finally {
            // Explicitly clear all references to ensure complete cleanup
            ai = null;
            response = null;
            console.log(`🗑️ AI instance destroyed for: ${chapterUrl}`);
        }
    };

    // Main API function with retry logic - each retry gets a completely fresh instance
    const callGeminiApi = async (apiKey: string, chapterUrl: string): Promise<string> => {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                // Each attempt creates a completely independent AI instance
                return await translateSingleChapter(apiKey, chapterUrl);
            } catch (error) {
                console.error(`🔄 Attempt ${retries + 1} failed for ${chapterUrl}:`, error);
                retries++;
                if (retries < maxRetries) {
                    console.log(`⏳ Waiting 1 second before creating fresh instance for retry ${retries + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Failed to translate chapter after multiple fresh attempts.');
    };

    // Convert plain text with line breaks to proper HTML for EPUB
    const convertTextToHTML = (text: string): string => {
        // Split text into paragraphs (double line breaks indicate paragraph breaks)
        const paragraphs = text.split('\n\n');
        
        let htmlContent = '';
        
        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') continue;
            
            // Handle scene breaks (*** on its own line)
            if (paragraph.trim() === '***') {
                htmlContent += '<div style="text-align: center; margin: 1em 0; font-weight: bold;">***</div>\n';
                continue;
            }
            
            // Process the paragraph for italics and dialogue
            let processedParagraph = paragraph.trim();
            
            // Convert *italics* to <em>italics</em>
            processedParagraph = processedParagraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Handle single line breaks within paragraphs (preserve them as <br>)
            processedParagraph = processedParagraph.replace(/\n/g, '<br>');
            
            // Wrap in paragraph tags
            htmlContent += `<p>${processedParagraph}</p>\n`;
        }
        
        return htmlContent;
    };

    const handleDownload = async () => {
        if (translatedChapters.length === 0) {
            setStatus('No chapters translated yet to download.');
            return;
        }

        setStatus('Generating EPUB...');

        try {
            const epub = new (window as any).jEpub();
            epub.init({
                title: outputFileName,
                author: 'Web Novel Translator',
                publisher: 'Web Novel Translator App',
                // Add other metadata as needed
            });
            
            translatedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

            for (const chapter of translatedChapters) {
                const allLines = chapter.translatedText.split('\n');
                const nonEmptyLines = allLines.filter(line => line.trim() !== '');
                let title = `Chapter ${chapter.chapterNumber}`;
                let content = chapter.translatedText;

                if (nonEmptyLines.length > 0) {
                    const firstLine = nonEmptyLines[0];
                    const titleMatch = firstLine.match(/^(.*)\[chapter: \d+\]$/i);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1].trim();
                        // Remove the title line and the URL line, but preserve line breaks
                        const titleLineIndex = allLines.findIndex(line => line.trim() === firstLine.trim());
                        const urlLineIndex = allLines.map((line, index) => line.trim().startsWith('https://') ? index : -1).filter(index => index !== -1).pop() ?? -1;
                        if (titleLineIndex >= 0 && urlLineIndex >= 0) {
                            const rawContent = allLines.slice(titleLineIndex + 1, urlLineIndex).join('\n').trim();
                            content = convertTextToHTML(rawContent);
                        }
                    } else {
                        // If no specific title format found, remove only the URL line
                        const urlLineIndex = allLines.map((line, index) => line.trim().startsWith('https://') ? index : -1).filter(index => index !== -1).pop() ?? -1;
                        if (urlLineIndex >= 0) {
                            const rawContent = allLines.slice(0, urlLineIndex).join('\n').trim();
                            content = convertTextToHTML(rawContent);
                        }
                    }
                }

                epub.add(title, content);
            }
            
            const blob = await epub.generate('blob');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${outputFileName}.epub`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatus('EPUB generated and downloaded!');
        } catch (error: any) {
            setStatus(`Error generating EPUB: ${error.message}`);
            console.error('Error generating EPUB:', error);
        }
    };

  return (
        <div className="container">
            <h1>Web Novel Translator</h1>

            <div className="input-group">
                <label htmlFor="geminiApiKey">Gemini API Key:</label>
                <input 
                    type="password" 
                    id="geminiApiKey" 
                    placeholder="Enter your Gemini API Key" 
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                />
            </div>

            <div className="input-group">
                <label htmlFor="siteSelect">Select Site:</label>
                <select 
                    id="siteSelect" 
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                >
                    <option value="syosetu">https://ncode.syosetu.com/</option>
                </select>
            </div>

            <div className="input-group">
                <label htmlFor="seriesUrl">Series URL:</label>
                <input 
                    type="url" 
                    id="seriesUrl" 
                    placeholder="e.g., https://ncode.syosetu.com/n5547eo" 
                    value={seriesUrl}
                    onChange={(e) => setSeriesUrl(e.target.value)}
                />
            </div>

            <div className="input-group">
                <label htmlFor="startChapter">Start Chapter:</label>
                <input 
                    type="number" 
                    id="startChapter" 
                    value={startChapter}
                    onChange={(e) => setStartChapter(parseInt(e.target.value))}
                    min={1}
                />
            </div>

            <div className="input-group">
                <label htmlFor="numChapters">Number of Chapters:</label>
                <input 
                    type="number" 
                    id="numChapters" 
                    value={numChapters}
                    onChange={(e) => setNumChapters(parseInt(e.target.value))}
                    min={1}
                />
            </div>
            
            <div className="input-group">
                <label htmlFor="outputFileName">Output File Name:</label>
                <input 
                    type="text" 
                    id="outputFileName" 
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                />
            </div>

            <div className="button-group">
                <button id="translateButton" onClick={handleTranslate} disabled={isTranslating}>Translate</button>
                <button id="downloadButton" onClick={handleDownload} disabled={translatedChapters.length === 0 || isTranslating}>Download EPUB</button>
            </div>

            <div id="status" className="status">{status}</div>
            {isTranslating && numChapters > 0 && (
                <div className="progress-bar-container">
                    <div 
                        className="progress-bar"
                        style={{ width: `${translationProgress}%` }}
                    >
                        {translationProgress > 0 ? `${translationProgress}% translated` : '0% translated'}
                    </div>
                </div>
            )}
            {translatedChapters.length > 0 && (
                <div className="preview-text-container">
                    <h2>Translated Chapters</h2>
                    <div className="chapter-selector">
                        <label htmlFor="chapterSelect">Select Chapter to View:</label>
                        <select 
                            id="chapterSelect" 
                            value={selectedChapter || ''}
                            onChange={(e) => setSelectedChapter(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">-- Select a chapter --</option>
                            {translatedChapters
                                .sort((a, b) => a.chapterNumber - b.chapterNumber)
                                .map(chapter => (
                                    <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                                        Chapter {chapter.chapterNumber}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    {selectedChapter && (
                        <div className="chapter-content">
                            <h3>Chapter {selectedChapter}</h3>
                            <pre className="chapter-text">
                                {translatedChapters.find(ch => ch.chapterNumber === selectedChapter)?.translatedText || 'Chapter not found'}
                            </pre>
                        </div>
                    )}
      </div>
            )}
      </div>
    );
}

export default App;
