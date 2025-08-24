import { useState, useEffect } from 'react';
import './index.css';
import {
    GoogleGenAI,
  } from '@google/genai';


// Local storage keys
const STORAGE_KEYS = {
    GEMINI_API_KEY: 'wnt_gemini_api_key',
    SELECTED_MODEL: 'wnt_selected_model',
    SITE: 'wnt_site',
    SERIES_URL: 'wnt_series_url',
    SERIES_NAME: 'wnt_series_name',
    START_CHAPTER: 'wnt_start_chapter',
    NUM_CHAPTERS: 'wnt_num_chapters',
    OUTPUT_FILE_NAME: 'wnt_output_file_name',
    TRANSLATED_CHAPTERS: 'wnt_translated_chapters'
};

// Local storage utility functions
const loadFromStorage = (key: string, defaultValue: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error loading ${key} from localStorage:`, error);
        return defaultValue;
    }
};

const saveToStorage = (key: string, value: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error saving ${key} to localStorage:`, error);
    }
};

function App() {
    const [geminiApiKey, setGeminiApiKey] = useState<string>(() => loadFromStorage(STORAGE_KEYS.GEMINI_API_KEY, ''));
    const [selectedModel, setSelectedModel] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SELECTED_MODEL, 'gemini-2.5-flash'));
    const [site, setSite] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SITE, 'syosetu'));
    const [seriesUrl, setSeriesUrl] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SERIES_URL, ''));
    const [seriesName, setSeriesName] = useState<string>(() => loadFromStorage(STORAGE_KEYS.SERIES_NAME, ''));
    const [startChapter, setStartChapter] = useState<number>(() => loadFromStorage(STORAGE_KEYS.START_CHAPTER, 1));
    const [numChapters, setNumChapters] = useState<number>(() => loadFromStorage(STORAGE_KEYS.NUM_CHAPTERS, 1));
    const [outputFileName, setOutputFileName] = useState<string>(() => loadFromStorage(STORAGE_KEYS.OUTPUT_FILE_NAME, 'translated_novel'));
    const [status, setStatus] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [translatedChapters, setTranslatedChapters] = useState<Array<{ chapterNumber: number; translatedText: string }>>(() => loadFromStorage(STORAGE_KEYS.TRANSLATED_CHAPTERS, []));
    const [translationProgress, setTranslationProgress] = useState<number>(0); // 0-100
    // const [previewText, setPreviewText] = useState<string>(''); // Removed - using chapter selector instead
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null); // For chapter selector
    const [showFallbackInput, setShowFallbackInput] = useState<boolean>(false);
    const [fallbackChapterNumber, setFallbackChapterNumber] = useState<number>(0);
    const [fallbackText, setFallbackText] = useState<string>('');
    const [fallbackType, setFallbackType] = useState<'japanese' | 'english'>('japanese');
    const [editingChapter, setEditingChapter] = useState<number | null>(null);
    const [editText, setEditText] = useState<string>('');

    // Auto-save form data to localStorage
    useEffect(() => {
        saveToStorage(STORAGE_KEYS.GEMINI_API_KEY, geminiApiKey);
    }, [geminiApiKey]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SELECTED_MODEL, selectedModel);
    }, [selectedModel]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SITE, site);
    }, [site]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SERIES_URL, seriesUrl);
    }, [seriesUrl]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SERIES_NAME, seriesName);
    }, [seriesName]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.START_CHAPTER, startChapter);
    }, [startChapter]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.NUM_CHAPTERS, numChapters);
    }, [numChapters]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.OUTPUT_FILE_NAME, outputFileName);
    }, [outputFileName]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.TRANSLATED_CHAPTERS, translatedChapters);
    }, [translatedChapters]);

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
        setStatus('Starting translation...');
        setTranslationProgress(0);

        // Keep existing chapters, only add new ones
        const newTranslatedChapters: Array<{ chapterNumber: number; translatedText: string }> = [...translatedChapters];

        const seriesIdMatch = seriesUrl.match(/ncode\.syosetu\.com\/(n\d+[a-zA-Z]+)/);
        const seriesIdentifier = seriesIdMatch && seriesIdMatch[1] ? seriesIdMatch[1] : seriesUrl; // Use series ID or full URL as fallback

        for (let i = 0; i < numChapters; i++) {
            const chapterNumber = startChapter + i;
            
            // Skip if chapter already exists
            if (newTranslatedChapters.find(ch => ch.chapterNumber === chapterNumber)) {
                setStatus(`Skipping chapter ${chapterNumber} (already translated)...`);
                continue;
            }
            
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
                // Save whatever chapters we managed to translate so far
                setTranslatedChapters(newTranslatedChapters);
                
                const translatedCount = newTranslatedChapters.length;
                console.error(`Error translating chapter ${chapterNumber}:`, error);
                
                // Check if this is a translation without markers - special handling
                if (error.message === 'TRANSLATION_WITHOUT_MARKERS' && error.fullText) {
                    console.log(`📝 Translation completed but markers missing. Showing fallback with pre-filled text.`);
                    setFallbackChapterNumber(chapterNumber);
                    setFallbackText(error.fullText); // Pre-fill with the actual translation
                    setFallbackType('english'); // Set to English since it's already translated
                    setShowFallbackInput(true);
                    setIsTranslating(false);
                    
                    setStatus(`Chapter ${chapterNumber} translated successfully but formatting markers were missing. The translation has been loaded below for your review. You can edit it if needed or add it directly.`);
                } else {
                    // Regular error - show empty fallback input
                    setFallbackChapterNumber(chapterNumber);
                    setFallbackText('');
                    setShowFallbackInput(true);
                    setIsTranslating(false);
                    
                    if (translatedCount > 0) {
                        setStatus(`Translation stopped at chapter ${chapterNumber}. Successfully translated ${translatedCount} chapter${translatedCount > 1 ? 's' : ''} (chapters ${newTranslatedChapters.map(ch => ch.chapterNumber).join(', ')}). You can provide the text manually below to continue.`);
                    } else {
                        setStatus(`Translation failed on chapter ${chapterNumber}. You can provide the text manually below to continue.`);
                    }
                }
                
                // Keep the progress at current level instead of resetting to 0
                setTranslationProgress(Math.round((translatedCount / numChapters) * 100));
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

    // Handle fallback manual text input
    const handleFallbackSubmit = async () => {
        if (!fallbackText.trim()) {
            setStatus(`Please enter the ${fallbackType === 'japanese' ? 'Japanese text for translation' : 'English translation'}.`);
            return;
        }

        if (fallbackType === 'english') {
            // Direct English input - no translation needed
            const updatedChapters = [...translatedChapters, { chapterNumber: fallbackChapterNumber, translatedText: fallbackText.trim() }];
            setTranslatedChapters(updatedChapters);
            setShowFallbackInput(false);
            setFallbackText('');
            setStatus(`Chapter ${fallbackChapterNumber} added manually. Ready to download EPUB or continue with remaining chapters.`);
            return;
        }

        setStatus(`Translating manually provided Japanese text for chapter ${fallbackChapterNumber}...`);
        
        try {
            // Create a modified prompt for direct text translation
            const fallbackSeriesContext = seriesName.trim() ? `\n\n**SERIES CONTEXT:**\nThis chapter is from the series: "${seriesName}"\nPlease use this series name as context for character name consistency, gender identification, and proper noun translations. Maintain consistent character name spellings and gender pronouns throughout the translation based on this series context.` : '';
            
            const directTranslationPrompt = `You are an expert translator and typesetter specializing in web novels. Your task is to translate the provided Japanese text into English, following a very strict set of rules for both content and formatting.${fallbackSeriesContext}

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process, analysis, or reasoning. Your response must contain ONLY the final translated chapter content.

**OUTPUT FORMAT MARKERS:**
You MUST start your response with exactly "***TRANSLATION_START***" followed by a newline, then provide your translation, and end with a newline followed by exactly "***TRANSLATION_END***".

**Required Output Format:**
* **Line 1:** The translated chapter title, followed by the chapter number formatted as \`[chapter: ${fallbackChapterNumber}]\`.
* **Body:** The full, translated text of the chapter's body, formatted according to the detailed rules below.

**Detailed Formatting Rules for the Chapter Body:**
1. **Paragraph Spacing:** Separate every paragraph with a single blank line (i.e., double-spaced). This includes lines of dialogue. This is the most important formatting rule.
2. **Dialogue:** Enclose all spoken dialogue in double quotation marks (\`"..."\`). Every change in speaker must begin on a new, separate paragraph.
3. **Internal Thoughts:** When a character is thinking to themselves (internal monologue), format their thoughts in *italics*.
4. **Scene Breaks:** If the original text uses a line of symbols (like \`………\` or \`* * *\`) to indicate a break in the scene, replace it with a clean, centered \`***\` on its own line, with blank lines above and below it.
5. **Character Consistency:** Pay special attention to maintaining consistent character name spellings and correct gender pronouns throughout the translation.

**REMEMBER: Start your response immediately with ***TRANSLATION_START*** then the chapter title. No explanations, no process descriptions.**

Now, please translate the following Japanese text:`;

            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const config = {
                systemInstruction: [{ text: directTranslationPrompt }],
            };
            const contents = [{
                role: 'user',
                parts: [{ text: fallbackText }],
            }];

            const response = await ai.models.generateContentStream({
                model: selectedModel,
                config,
                contents,
            });

            let fullText = '';
            for await (const chunk of response) {
                if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
                    const chunkText = chunk.candidates[0].content.parts.map((part: any) => part.text).join('');
                    fullText += chunkText;
                }
            }

            // Extract text between {{start}} and {{end}} markers
            const startMarker = '{{start}}';
            const endMarker = '{{end}}';
            const startIndex = fullText.indexOf(startMarker);
            const endIndex = fullText.lastIndexOf(endMarker);
            
            let extractedText = fullText;
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                extractedText = fullText.substring(startIndex + startMarker.length, endIndex).trim();
            }

            // Add the translated chapter to the list
            const updatedChapters = [...translatedChapters, { chapterNumber: fallbackChapterNumber, translatedText: extractedText }];
            setTranslatedChapters(updatedChapters);
            
            // Hide fallback input and continue
            setShowFallbackInput(false);
            setFallbackText('');
            setStatus(`Chapter ${fallbackChapterNumber} translated manually. Ready to download EPUB or continue with remaining chapters.`);

        } catch (error: any) {
            setStatus(`Error translating manual text for chapter ${fallbackChapterNumber}: ${error.message}`);
        }
    };

    // Handle chapter editing
    const handleEditChapter = (chapterNumber: number) => {
        const chapter = translatedChapters.find(ch => ch.chapterNumber === chapterNumber);
        if (chapter) {
            setEditingChapter(chapterNumber);
            setEditText(chapter.translatedText);
        }
    };

    const handleSaveEdit = () => {
        if (editingChapter !== null) {
            const updatedChapters = translatedChapters.map(ch => 
                ch.chapterNumber === editingChapter 
                    ? { ...ch, translatedText: editText }
                    : ch
            );
            setTranslatedChapters(updatedChapters);
            setEditingChapter(null);
            setEditText('');
            setStatus(`Chapter ${editingChapter} updated successfully.`);
        }
    };

    const handleCancelEdit = () => {
        setEditingChapter(null);
        setEditText('');
    };

    // Handle chapter deletion
    const handleDeleteChapter = (chapterNumber: number) => {
        if (confirm(`Are you sure you want to delete Chapter ${chapterNumber}?`)) {
            const updatedChapters = translatedChapters.filter(ch => ch.chapterNumber !== chapterNumber);
            setTranslatedChapters(updatedChapters);
            
            // Clear selected chapter if it was deleted
            if (selectedChapter === chapterNumber) {
                setSelectedChapter(null);
            }
            
            setStatus(`Chapter ${chapterNumber} deleted successfully.`);
        }
    };

    // Handle clearing all data
    const handleClearAllData = () => {
        const confirmMessage = `⚠️ WARNING: This will permanently delete ALL data including:

• All form inputs (API key, URLs, settings)
• All translated chapters
• All saved progress

This action cannot be undone. Are you absolutely sure?`;

        if (confirm(confirmMessage)) {
            // Clear localStorage
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Reset all state to defaults
            setGeminiApiKey('');
            setSelectedModel('gemini-2.5-flash');
            setSite('syosetu');
            setSeriesUrl('');
            setSeriesName('');
            setStartChapter(1);
            setNumChapters(1);
            setOutputFileName('translated_novel');
            setTranslatedChapters([]);
            setSelectedChapter(null);
            setShowFallbackInput(false);
            setFallbackText('');
            setFallbackType('japanese');
            setEditingChapter(null);
            setEditText('');
            
            setStatus('All data cleared successfully.');
        }
    };

    // Independent translation function that creates a completely fresh AI instance for each chapter
    const translateSingleChapter = async (apiKey: string, chapterUrl: string, model: string, seriesName: string): Promise<string> => {
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
            const seriesContext = seriesName.trim() ? `\n\n**SERIES CONTEXT:**\nThis chapter is from the series: "${seriesName}"\nPlease use this series name as context for character name consistency, gender identification, and proper noun translations. Maintain consistent character name spellings and gender pronouns throughout the translation based on this series context.` : '';
            
            const systemPrompt = `You are an expert translator and typesetter specializing in web novels. Your task is to translate the web novel chapter from the provided URL into English, following a very strict set of rules for both content and formatting.${seriesContext}

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process, analysis, or reasoning. Do NOT include phrases like "I will translate", "Let me process", "Going through paragraph by paragraph", or any meta-commentary about your translation process. Your response must contain ONLY the final translated chapter content.

**CRITICAL INSTRUCTION: CLEAN OUTPUT**
Your final output must be completely clean prose. It is absolutely forbidden to include any form of in-line citation markers like \`[1]\`, source numbers, footnotes, or any other annotations within the translated text. The text must appear as it would in a published book. You must also remove any extraneous text from the source page, such as "Sources," "help," or the original Japanese title at the end of the text.

**Core Instructions:**

1.  **Use URL for Context:** Analyze the source page for character names, specific terms, and narrative tone to ensure a consistent and accurate translation.
2.  **Character Consistency:** Pay special attention to maintaining consistent character name spellings and correct gender pronouns throughout the translation.
3.  **Translate Only, No Chatter:** Your entire output must be *only* the final translated chapter as per the format below. Do not add any introductory phrases, summaries, explanations, or conversation about the translation process.
4.  **No Meta-Commentary:** Do not describe what you are doing, do not explain your process, do not mention translation steps.
5.  **Direct Translation Only:** Start immediately with the chapter title and proceed directly to the translated content.

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

**REMEMBER: Start your response immediately with the chapter title. No explanations, no process descriptions, no thinking out loud.**

**OUTPUT FORMAT MARKERS:**
You MUST start your response with exactly "***TRANSLATION_START***" followed by a newline, then provide your translation, and end with a newline followed by exactly "***TRANSLATION_END***".

Example:
***TRANSLATION_START***
Chapter Title [chapter: X]
[translated content here]
[source URL]
***TRANSLATION_END***

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
                model: model,
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
            
            // Check if translation is empty
            if (!fullText || fullText.trim().length === 0) {
                throw new Error('Translation returned empty content. The chapter might be blocked or inaccessible.');
            }
            
            // Debug: Log the first and last 200 characters of the response
            console.log(`🔍 Response preview (first 200 chars): "${fullText.substring(0, 200)}..."`);
            console.log(`🔍 Response preview (last 200 chars): "...${fullText.substring(Math.max(0, fullText.length - 200))}"`);
            
            // Extract text between markers - try multiple variations
            const possibleStartMarkers = ['***TRANSLATION_START***', '{{start}}', '{{ start }}', '{start}', 'START:', '**START**'];
            const possibleEndMarkers = ['***TRANSLATION_END***', '{{end}}', '{{ end }}', '{end}', 'END:', '**END**'];
            
            let startIndex = -1;
            let endIndex = -1;
            let usedStartMarker = '';
            let usedEndMarker = '';
            
            // Try to find start marker
            for (const marker of possibleStartMarkers) {
                const index = fullText.toLowerCase().indexOf(marker.toLowerCase());
                if (index !== -1) {
                    startIndex = index;
                    usedStartMarker = marker;
                    break;
                }
            }
            
            // Try to find end marker
            for (const marker of possibleEndMarkers) {
                const index = fullText.toLowerCase().lastIndexOf(marker.toLowerCase());
                if (index !== -1) {
                    endIndex = index;
                    usedEndMarker = marker;
                    break;
                }
            }
            
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                const extractedText = fullText.substring(startIndex + usedStartMarker.length, endIndex).trim();
                console.log(`📝 Extracted text using markers "${usedStartMarker}" and "${usedEndMarker}". Length: ${extractedText.length}`);
                
                // Check if extracted text is empty
                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error('Translation markers found but content is empty. The translation may have failed.');
                }
                
                return extractedText;
            } else {
                console.warn(`⚠️ No valid markers found in response. Tried: ${possibleStartMarkers.join(', ')} / ${possibleEndMarkers.join(', ')}`);
                
                // If the response looks like a valid translation (contains chapter info), offer it as fallback
                if (fullText.includes('[chapter:') || fullText.includes('chapter') || fullText.length > 100) {
                    const fallbackError = new Error('TRANSLATION_WITHOUT_MARKERS');
                    (fallbackError as any).fullText = fullText; // Attach the full response
                    throw fallbackError;
                } else {
                    throw new Error('Translation markers not found and response doesn\'t appear to be a valid translation.');
                }
            }

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
                return await translateSingleChapter(apiKey, chapterUrl, selectedModel, seriesName);
            } catch (error: any) {
                console.error(`🔄 Attempt ${retries + 1} failed for ${chapterUrl}:`, error);
                retries++;
                
                // Check if it's a specific error that we shouldn't retry
                const errorMessage = error.message || error.toString();
                if (errorMessage.includes('403') || errorMessage.includes('blocked') || errorMessage.includes('access denied')) {
                    console.warn(`🚫 Access denied or blocked for ${chapterUrl}, not retrying`);
                    throw new Error(`Access denied or blocked for chapter. This might be due to rate limiting or the content being restricted. Original error: ${errorMessage}`);
                }
                
                // Check for character encoding issues (like HTML markers in headers)
                if (errorMessage.includes('ByteString') || errorMessage.includes('character at index') || errorMessage.includes('greater than 255')) {
                    console.warn(`🔤 Character encoding error for ${chapterUrl}, not retrying`);
                    throw new Error(`Character encoding error. This might be caused by special characters in the request. Original error: ${errorMessage}`);
                }
                
                // Check for empty content or missing markers - don't retry as this likely means the chapter is blocked
                if (errorMessage.includes('empty content') || errorMessage.includes('markers') || errorMessage.includes('inaccessible')) {
                    console.warn(`🚫 Content access issue for ${chapterUrl}, not retrying`);
                    throw new Error(`Chapter appears to be blocked or inaccessible. Original error: ${errorMessage}`);
                }
                
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
        if (!text || text.trim() === '') {
            return '<p>No content available.</p>';
        }

        // Normalize line breaks and split into paragraphs
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split by double line breaks for paragraphs, but also handle single line breaks
        let paragraphs: string[] = [];
        
        // First try splitting by double line breaks
        const doubleSplit = normalizedText.split('\n\n');
        
        if (doubleSplit.length > 1) {
            // We have proper paragraph breaks
            paragraphs = doubleSplit;
        } else {
            // No double breaks, split by single breaks and group logically
            const singleSplit = normalizedText.split('\n');
            let currentParagraph = '';
            
            for (const line of singleSplit) {
                const trimmedLine = line.trim();
                
                if (trimmedLine === '') {
                    if (currentParagraph.trim() !== '') {
                        paragraphs.push(currentParagraph.trim());
                        currentParagraph = '';
                    }
                } else if (trimmedLine === '***') {
                    if (currentParagraph.trim() !== '') {
                        paragraphs.push(currentParagraph.trim());
                        currentParagraph = '';
                    }
                    paragraphs.push('***');
                } else {
                    if (currentParagraph !== '') {
                        currentParagraph += '\n';
                    }
                    currentParagraph += line;
                }
            }
            
            if (currentParagraph.trim() !== '') {
                paragraphs.push(currentParagraph.trim());
            }
        }
        
        let htmlContent = '';
        
        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') continue;
            
            // Handle scene breaks (*** on its own line)
            if (paragraph.trim() === '***') {
                htmlContent += '<div style="text-align: center; margin: 1.5em 0; font-weight: bold; font-size: 1.2em;">***</div>\n';
                continue;
            }
            
            // Process the paragraph for italics and dialogue
            let processedParagraph = paragraph.trim();
            
            // Convert *italics* to <em>italics</em>
            processedParagraph = processedParagraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Handle line breaks within paragraphs (preserve them as <br>)
            processedParagraph = processedParagraph.replace(/\n/g, '<br>\n');
            
            // Wrap in paragraph tags with proper spacing
            htmlContent += `<p style="margin: 0 0 1em 0; line-height: 1.6;">${processedParagraph}</p>\n`;
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
                console.log(`Processing chapter ${chapter.chapterNumber} for EPUB...`);
                
                let title = `Chapter ${chapter.chapterNumber}`;
                let rawContent = chapter.translatedText;

                // More robust chapter processing
                const lines = chapter.translatedText.split('\n');
                
                // Find title line (should contain [chapter: X])
                const titleLineIndex = lines.findIndex(line => /\[chapter:\s*\d+\]/i.test(line));
                if (titleLineIndex >= 0) {
                    const titleLine = lines[titleLineIndex];
                    const titleMatch = titleLine.match(/^(.*?)\s*\[chapter:\s*\d+\]/i);
                    if (titleMatch && titleMatch[1]) {
                        const chapterTitle = titleMatch[1].trim();
                        title = `${chapterTitle} - Chapter ${chapter.chapterNumber}`;
                    } else {
                        title = `Chapter ${chapter.chapterNumber}`;
                    }
                } else {
                    title = `Chapter ${chapter.chapterNumber}`;
                }

                // Find URL line (last line that starts with https://)
                let urlLineIndex = -1;
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim().startsWith('https://')) {
                        urlLineIndex = i;
                        break;
                    }
                }

                // Extract content between title and URL
                if (titleLineIndex >= 0 && urlLineIndex >= 0) {
                    rawContent = lines.slice(titleLineIndex + 1, urlLineIndex).join('\n');
                } else if (titleLineIndex >= 0) {
                    // No URL found, take everything after title
                    rawContent = lines.slice(titleLineIndex + 1).join('\n');
                } else if (urlLineIndex >= 0) {
                    // No title found, take everything before URL
                    rawContent = lines.slice(0, urlLineIndex).join('\n');
                }

                // Clean up the content and convert to HTML
                rawContent = rawContent.trim();
                console.log(`Raw content length for chapter ${chapter.chapterNumber}:`, rawContent.length);
                
                const htmlContent = convertTextToHTML(rawContent);
                console.log(`HTML content length for chapter ${chapter.chapterNumber}:`, htmlContent.length);

                epub.add(title, htmlContent);
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
                <label htmlFor="modelSelect">Gemini Model:</label>
                <select 
                    id="modelSelect" 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
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
                <label htmlFor="seriesName">Series Name (Optional):</label>
                <input 
                    type="text" 
                    id="seriesName" 
                    placeholder="e.g., The Villainess Who Doesn't Want to Be Ruined" 
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                />
                <small className="input-help">Helps AI maintain consistent character names and genders across chapters</small>
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

            <div className="clear-data-section">
                <button 
                    className="clear-data-button" 
                    onClick={handleClearAllData} 
                    disabled={isTranslating}
                    title="Clear all saved data including form inputs and translated chapters"
                >
                    🗑️ Clear All Data
                </button>
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
            
            {showFallbackInput && (
                <div className="fallback-input-container">
                    <h3>Manual Text Input for Chapter {fallbackChapterNumber}</h3>
                    <p>Translation failed for this chapter. Please provide the text below:</p>
                    
                    <div className="fallback-type-selector">
                        <label>
                            <input
                                type="radio"
                                value="japanese"
                                checked={fallbackType === 'japanese'}
                                onChange={(e) => setFallbackType(e.target.value as 'japanese' | 'english')}
                            />
                            Japanese text (will be translated)
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="english"
                                checked={fallbackType === 'english'}
                                onChange={(e) => setFallbackType(e.target.value as 'japanese' | 'english')}
                            />
                            English text (already translated)
                        </label>
                    </div>
                    
                    <textarea
                        className="fallback-textarea"
                        value={fallbackText}
                        onChange={(e) => setFallbackText(e.target.value)}
                        placeholder={fallbackType === 'japanese' ? "Paste Japanese text here..." : "Paste English translation here..."}
                        rows={10}
                    />
                    <div className="fallback-buttons">
                        <button onClick={handleFallbackSubmit} disabled={!fallbackText.trim()}>
                            {fallbackType === 'japanese' ? 'Translate Text' : 'Add Text'}
                        </button>
                        {fallbackType === 'english' && fallbackText.trim() && (
                            <button 
                                onClick={() => {
                                    setFallbackType('japanese');
                                    setFallbackText('');
                                }} 
                                className="retry-button"
                            >
                                Try Again (Translate from Japanese)
                            </button>
                        )}
                        <button onClick={() => setShowFallbackInput(false)} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {translatedChapters.length > 0 && (
                <div className="preview-text-container">
                    <h2>Translated Chapters</h2>
                    
                    {/* Table of Contents */}
                    <div className="table-of-contents">
                        <h3>Table of Contents</h3>
                        <div className="chapter-list">
                            {translatedChapters
                                .sort((a, b) => a.chapterNumber - b.chapterNumber)
                                .map(chapter => (
                                    <div key={chapter.chapterNumber} className="chapter-item">
                                        <div className="chapter-info">
                                            <span className="chapter-title">Chapter {chapter.chapterNumber}</span>
                                            <span className="chapter-length">
                                                {chapter.translatedText.length.toLocaleString()} characters
                                            </span>
                                        </div>
                                        <div className="chapter-actions">
                                            <button 
                                                className="view-button"
                                                onClick={() => setSelectedChapter(chapter.chapterNumber)}
                                            >
                                                View
                                            </button>
                                            <button 
                                                className="delete-button"
                                                onClick={() => handleDeleteChapter(chapter.chapterNumber)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    
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
                            <div className="chapter-header">
                                <h3>Chapter {selectedChapter}</h3>
                                <button 
                                    className="edit-button"
                                    onClick={() => handleEditChapter(selectedChapter)}
                                    disabled={editingChapter !== null}
                                >
                                    {editingChapter === selectedChapter ? 'Editing...' : 'Edit Chapter'}
                                </button>
                            </div>
                            
                            {editingChapter === selectedChapter ? (
                                <div className="edit-container">
                                    <textarea
                                        className="edit-textarea"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={20}
                                    />
                                    <div className="edit-buttons">
                                        <button onClick={handleSaveEdit} className="save-button">
                                            Save Changes
                                        </button>
                                        <button onClick={handleCancelEdit} className="cancel-button">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <pre className="chapter-text">
                                    {translatedChapters.find(ch => ch.chapterNumber === selectedChapter)?.translatedText || 'Chapter not found'}
                                </pre>
                            )}
                        </div>
                    )}
      </div>
            )}
      </div>
    );
}

export default App;
