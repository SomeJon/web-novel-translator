import { useState, useEffect } from 'react';
import './index.css';

// Import services and utilities
import { 
    loadAppState, 
    saveStateValue, 
    clearAllStorage,
    type TranslatedChapter 
} from './storage';
import { 
    translateChapterWithRetry, 
    translateJapaneseText,
    TranslationWithoutMarkersError,
    type TranslationOptions 
} from './translationService';
import { generateAndDownloadEPUB } from './epubService';
import { 
    generateGlossarySegments,
    updateCharacterInGlossary,
    addCharacterToGlossary,
    removeCharacterFromGlossary
} from './services/glossaryService';
import type { Glossary, GlossaryCollection, Character } from './types/glossary';

// Import components
import {
    TranslationForm,
    FallbackInput,
    ChaptersDisplay,
    ProgressDisplay,
    GlossaryDisplay
} from './components';

function App() {
    // Load initial state from localStorage
    const initialState = loadAppState();
    
    // Form state
    const [geminiApiKey, setGeminiApiKey] = useState(initialState.geminiApiKey);
    const [selectedModel, setSelectedModel] = useState(initialState.selectedModel);
    const [site, setSite] = useState(initialState.site);
    const [seriesUrl, setSeriesUrl] = useState(initialState.seriesUrl);
    const [seriesName, setSeriesName] = useState(initialState.seriesName);
    const [startChapter, setStartChapter] = useState(initialState.startChapter);
    const [numChapters, setNumChapters] = useState(initialState.numChapters);
    const [outputFileName, setOutputFileName] = useState(initialState.outputFileName);
    
    // Separate glossary range
    const [glossaryStartChapter, setGlossaryStartChapter] = useState(initialState.glossaryStartChapter);
    const [glossaryNumChapters, setGlossaryNumChapters] = useState(initialState.glossaryNumChapters);
    
    // Translation state
    const [status, setStatus] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [shouldStopTranslation, setShouldStopTranslation] = useState(false);
    const [translatedChapters, setTranslatedChapters] = useState<TranslatedChapter[]>(initialState.translatedChapters);
    const [translationProgress, setTranslationProgress] = useState(0);
    
    // Glossary state
    const [glossary, setGlossary] = useState<Glossary | null>(initialState.glossary); // Legacy
    const [glossaryCollection, setGlossaryCollection] = useState<GlossaryCollection | null>(initialState.glossaryCollection);
    const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
    
    // UI state
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [showFallbackInput, setShowFallbackInput] = useState(false);
    const [fallbackChapterNumber, setFallbackChapterNumber] = useState(0);
    const [fallbackText, setFallbackText] = useState('');
    const [fallbackType, setFallbackType] = useState<'japanese' | 'english'>('japanese');
    const [editingChapter, setEditingChapter] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    // Auto-save form data to localStorage
    useEffect(() => saveStateValue('geminiApiKey', geminiApiKey), [geminiApiKey]);
    useEffect(() => saveStateValue('selectedModel', selectedModel), [selectedModel]);
    useEffect(() => saveStateValue('site', site), [site]);
    useEffect(() => saveStateValue('seriesUrl', seriesUrl), [seriesUrl]);
    useEffect(() => saveStateValue('seriesName', seriesName), [seriesName]);
    useEffect(() => saveStateValue('startChapter', startChapter), [startChapter]);
    useEffect(() => saveStateValue('numChapters', numChapters), [numChapters]);
    useEffect(() => saveStateValue('outputFileName', outputFileName), [outputFileName]);
    useEffect(() => saveStateValue('translatedChapters', translatedChapters), [translatedChapters]);
    useEffect(() => saveStateValue('glossary', glossary), [glossary]);
    useEffect(() => saveStateValue('glossaryCollection', glossaryCollection), [glossaryCollection]);
    useEffect(() => saveStateValue('glossaryStartChapter', glossaryStartChapter), [glossaryStartChapter]);
    useEffect(() => saveStateValue('glossaryNumChapters', glossaryNumChapters), [glossaryNumChapters]);

    // Glossary handlers
    const handleGenerateGlossary = async () => {
        if (!geminiApiKey) {
            setStatus('Please enter your Gemini API Key to generate glossary.');
            return;
        }

        if (!seriesUrl) {
            setStatus('Please enter the series URL to generate glossary.');
            return;
        }

        if (!glossaryStartChapter || !glossaryNumChapters) {
            setStatus('Please specify the glossary chapter range to generate glossary.');
            return;
        }

        setIsGeneratingGlossary(true);
        const totalSegments = Math.ceil(glossaryNumChapters / 10);
        
        if (selectedModel === 'gemini-2.5-pro') {
            setStatus(`⚠️ Using ${selectedModel} - This will be slow due to strict rate limits (2 requests/minute). Consider using 'gemini-2.0-flash-exp' for faster generation.`);
        } else {
            setStatus(`🔄 Generating ${totalSegments} progressive glossary segments (10 chapters each) with ultra-concise character profiles...`);
        }

        try {
            // Create chapter URLs for the glossary range (original Japanese chapters)
            const chapterUrls: string[] = [];
            const chapterRange = {
                start: glossaryStartChapter,
                end: glossaryStartChapter + glossaryNumChapters - 1
            };

            // Generate all chapter URLs in the specified range
            for (let i = 0; i < glossaryNumChapters; i++) {
                const chapterNumber = glossaryStartChapter + i;
                if (site === 'syosetu') {
                    const baseUrl = seriesUrl.endsWith('/') ? seriesUrl.slice(0, -1) : seriesUrl;
                    chapterUrls.push(`${baseUrl}/${chapterNumber}/`);
                } else {
                    setStatus(`Error: Unsupported site selected: ${site}`);
                    setIsGeneratingGlossary(false);
                    return;
                }
            }

            console.log(`📚 Generating ${totalSegments} progressive glossary segments from ${chapterUrls.length} original Japanese chapters`);

            const result = await generateGlossarySegments({
                apiKey: geminiApiKey,
                model: selectedModel,
                seriesName: seriesName || 'Unknown Series',
                chapterUrls,
                chapterRange
            });

            if (result.success && result.collection) {
                setGlossaryCollection(result.collection);
                const totalCharacters = result.collection.segments.reduce((sum, segment) => sum + segment.characters.length, 0);
                const majorCount = result.collection.segments.reduce((sum, segment) => 
                    sum + segment.characters.filter(c => c.importance === 'major').length, 0);
                const minorCount = result.collection.segments.reduce((sum, segment) => 
                    sum + segment.characters.filter(c => c.importance === 'minor').length, 0);
                
                setStatus(`✅ Generated ${result.collection.segments.length} progressive glossary segments! Total unique characters: ~${totalCharacters} (${majorCount} major, ${minorCount} minor). Character development tracked across story arcs! 📈`);
            } else {
                setStatus(`❌ Failed to generate glossary segments: ${result.error}`);
            }

        } catch (error: any) {
            console.error('Glossary generation error:', error);
            setStatus(`❌ Error generating glossary: ${error.message}`);
        } finally {
            setIsGeneratingGlossary(false);
        }
    };

    const handleDeleteGlossary = () => {
        if (window.confirm('Are you sure you want to delete the current glossary? This action cannot be undone.')) {
            setGlossary(null);
            setGlossaryCollection(null);
            setStatus('✅ Glossary deleted successfully.');
        }
    };

    const handleUpdateCharacter = (characterId: string, updates: Partial<Character>) => {
        if (glossary) {
            const updatedGlossary = updateCharacterInGlossary(glossary, characterId, updates);
            setGlossary(updatedGlossary);
            setStatus(`Character updated successfully.`);
        }
    };

    const handleAddCharacter = (character: Omit<Character, 'id' | 'lastModified'>) => {
        if (glossary) {
            const updatedGlossary = addCharacterToGlossary(glossary, character);
            setGlossary(updatedGlossary);
            setStatus(`New character "${character.englishName}" added to glossary.`);
        }
    };

    const handleDeleteCharacter = (characterId: string) => {
        if (glossary) {
            const character = glossary.characters.find(c => c.id === characterId);
            const updatedGlossary = removeCharacterFromGlossary(glossary, characterId);
            setGlossary(updatedGlossary);
            setStatus(`Character "${character?.englishName || 'Unknown'}" removed from glossary.`);
        }
    };

    const handleUpdateLastProcessedChapter = (chapter: number) => {
        if (glossaryCollection) {
            const updatedCollection = {
                ...glossaryCollection,
                lastProcessedChapter: chapter,
                lastModified: Date.now()
            };
            setGlossaryCollection(updatedCollection);
            setStatus(`Last processed chapter updated to ${chapter}. Next generation will continue from chapter ${chapter + 1}.`);
        } else if (glossary) {
            // Legacy support
            const updatedGlossary = {
                ...glossary,
                lastProcessedChapter: chapter,
                lastModified: Date.now()
            };
            setGlossary(updatedGlossary);
            setStatus(`Last processed chapter updated to ${chapter}. Next generation will continue from chapter ${chapter + 1}.`);
        }
    };

    // Translation handlers
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
        setShouldStopTranslation(false);
        setStatus('Starting translation...');
        setTranslationProgress(0);

        // Keep existing chapters, only add new ones
        const newTranslatedChapters: TranslatedChapter[] = [...translatedChapters];

        const seriesIdMatch = seriesUrl.match(/ncode\.syosetu\.com\/(n\d+[a-zA-Z]+)/);
        const seriesIdentifier = seriesIdMatch?.[1] || seriesUrl;

        // Create combined glossary for translation (from all segments)
        let combinedGlossary: Glossary | null = null;
        if (glossaryCollection && glossaryCollection.segments.length > 0) {
            // Merge all segment characters into a single glossary for translation
            const allCharacters = glossaryCollection.segments.flatMap(segment => segment.characters);
            combinedGlossary = {
                characters: allCharacters,
                seriesName: glossaryCollection.seriesName,
                chapterRange: glossaryCollection.totalChapterRange,
                lastProcessedChapter: glossaryCollection.lastProcessedChapter,
                generatedAt: glossaryCollection.createdAt,
                lastModified: glossaryCollection.lastModified
            };
        }

        const translationOptions: TranslationOptions = {
            apiKey: geminiApiKey,
            model: selectedModel,
            seriesName,
            glossary: combinedGlossary || glossary // Use combined glossary or legacy single glossary
        };

        for (let i = 0; i < numChapters; i++) {
            const chapterNumber = startChapter + i;
            
            // Check if user requested to stop translation
            if (shouldStopTranslation) {
                setStatus(`Translation stopped by user at chapter ${chapterNumber}. ${newTranslatedChapters.length} chapters translated and saved.`);
                setTranslatedChapters(newTranslatedChapters);
                setIsTranslating(false);
                return;
            }
            
            // Skip if chapter already exists
            if (newTranslatedChapters.find(ch => ch.chapterNumber === chapterNumber)) {
                setStatus(`Skipping chapter ${chapterNumber} (already translated)...`);
                continue;
            }
            
            let chapterUrl: string;
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
                const result = await translateChapterWithRetry(chapterUrl, translationOptions);
                
                if (result.success && result.text) {
                    newTranslatedChapters.push({ 
                        chapterNumber, 
                        translatedText: result.text 
                    });
                    setTranslationProgress(Math.round(((i + 1) / numChapters) * 100));
                } else {
                    throw new Error(result.error || 'Translation failed');
                }
                
            } catch (error: any) {
                // Save whatever chapters we managed to translate so far
                setTranslatedChapters(newTranslatedChapters);
                
                const translatedCount = newTranslatedChapters.length;
                console.error(`Error translating chapter ${chapterNumber}:`, error);
                
                // Check if this is a translation without markers - special handling
                if (error instanceof TranslationWithoutMarkersError) {
                    console.log(`📝 Translation completed but markers missing. Showing fallback with pre-filled text.`);
                    setFallbackChapterNumber(chapterNumber);
                    setFallbackText(error.fullText);
                    setFallbackType('english');
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
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        setTranslatedChapters(newTranslatedChapters);
        setStatus('All chapters translated. Ready to download EPUB.');
        setIsTranslating(false);
        setShouldStopTranslation(false);
    };

    const handleStopTranslation = () => {
        setShouldStopTranslation(true);
        setStatus('Stopping translation after current chapter...');
    };

    // Fallback input handlers
    const handleFallbackSubmit = async () => {
        if (!fallbackText.trim()) {
            setStatus(`Please enter the ${fallbackType === 'japanese' ? 'Japanese text for translation' : 'English translation'}.`);
            return;
        }

        if (fallbackType === 'english') {
            // Direct English input - no translation needed
            const updatedChapters = [...translatedChapters, { 
                chapterNumber: fallbackChapterNumber, 
                translatedText: fallbackText.trim() 
            }];
            setTranslatedChapters(updatedChapters);
            setShowFallbackInput(false);
            setFallbackText('');
            setStatus(`Chapter ${fallbackChapterNumber} added manually. Ready to download EPUB or continue with remaining chapters.`);
            return;
        }

        setStatus(`Translating manually provided Japanese text for chapter ${fallbackChapterNumber}...`);
        
        try {
            const result = await translateJapaneseText(
                fallbackText,
                fallbackChapterNumber,
                {
                    apiKey: geminiApiKey,
                    model: selectedModel,
                    seriesName,
                    glossary: glossary // Pass glossary to fallback translation
                }
            );

            if (result.success && result.text) {
                const updatedChapters = [...translatedChapters, { 
                    chapterNumber: fallbackChapterNumber, 
                    translatedText: result.text 
                }];
                setTranslatedChapters(updatedChapters);
                setShowFallbackInput(false);
                setFallbackText('');
                setStatus(`Chapter ${fallbackChapterNumber} translated manually. Ready to download EPUB or continue with remaining chapters.`);
            } else {
                setStatus(`Error translating manual text for chapter ${fallbackChapterNumber}: ${result.error}`);
            }

        } catch (error: any) {
            setStatus(`Error translating manual text for chapter ${fallbackChapterNumber}: ${error.message}`);
        }
    };

    // Chapter management handlers
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

    // Download handler
    const handleDownload = async () => {
        if (translatedChapters.length === 0) {
            setStatus('No chapters to download.');
            return;
        }

        try {
            setStatus('Generating EPUB...');
            await generateAndDownloadEPUB(translatedChapters, outputFileName);
            setStatus('EPUB downloaded successfully!');
        } catch (error: any) {
            setStatus(`Error generating EPUB: ${error.message}`);
            console.error('EPUB generation error:', error);
        }
    };

    // Clear data handler
    const handleClearAllData = () => {
        const confirmMessage = `⚠️ WARNING: This will permanently delete ALL data including:

• All form inputs (API key, URLs, settings)
• All translated chapters
• All saved progress

This action cannot be undone. Are you absolutely sure?`;

        if (confirm(confirmMessage)) {
            clearAllStorage();
            
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
            setGlossary(null);
            setGlossaryCollection(null);
            setGlossaryStartChapter(1);
            setGlossaryNumChapters(10);
            setShouldStopTranslation(false);
            setSelectedChapter(null);
            setShowFallbackInput(false);
            setFallbackText('');
            setFallbackType('japanese');
            setEditingChapter(null);
            setEditText('');
            
            setStatus('All data cleared successfully.');
        }
    };

  return (
        <div className="container">
            <h1>Web Novel Translator</h1>

            <TranslationForm
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                site={site}
                setSite={setSite}
                seriesUrl={seriesUrl}
                setSeriesUrl={setSeriesUrl}
                seriesName={seriesName}
                setSeriesName={setSeriesName}
                startChapter={startChapter}
                setStartChapter={setStartChapter}
                numChapters={numChapters}
                setNumChapters={setNumChapters}
                outputFileName={outputFileName}
                setOutputFileName={setOutputFileName}
                onTranslate={handleTranslate}
                onStopTranslation={handleStopTranslation}
                onDownload={handleDownload}
                onClearData={handleClearAllData}
                isTranslating={isTranslating}
                hasTranslatedChapters={translatedChapters.length > 0}
            />

            <ProgressDisplay
                status={status}
                isTranslating={isTranslating}
                progress={translationProgress}
                numChapters={numChapters}
            />
            
            <FallbackInput
                show={showFallbackInput}
                chapterNumber={fallbackChapterNumber}
                text={fallbackText}
                setText={setFallbackText}
                type={fallbackType}
                setType={setFallbackType}
                onSubmit={handleFallbackSubmit}
                onCancel={() => setShowFallbackInput(false)}
            />
            
            <ChaptersDisplay
                chapters={translatedChapters}
                selectedChapter={selectedChapter}
                setSelectedChapter={setSelectedChapter}
                editingChapter={editingChapter}
                editText={editText}
                setEditText={setEditText}
                onEditChapter={handleEditChapter}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onDeleteChapter={handleDeleteChapter}
            />

            <GlossaryDisplay
                glossary={glossary}
                glossaryCollection={glossaryCollection}
                onGenerateGlossary={handleGenerateGlossary}
                onDeleteGlossary={handleDeleteGlossary}
                onUpdateCharacter={handleUpdateCharacter}
                onAddCharacter={handleAddCharacter}
                onDeleteCharacter={handleDeleteCharacter}
                onUpdateLastProcessedChapter={handleUpdateLastProcessedChapter}
                isGenerating={isGeneratingGlossary}
                glossaryStartChapter={glossaryStartChapter}
                glossaryNumChapters={glossaryNumChapters}
                onGlossaryStartChapterChange={setGlossaryStartChapter}
                onGlossaryNumChaptersChange={setGlossaryNumChapters}
            />
      </div>
    );
}

export default App;