/**
 * Translation form component for input fields and controls
 */

import React from 'react';

export interface TranslationFormProps {
    geminiApiKey: string;
    setGeminiApiKey: (value: string) => void;
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    site: string;
    setSite: (value: string) => void;
    seriesUrl: string;
    setSeriesUrl: (value: string) => void;
    seriesName: string;
    setSeriesName: (value: string) => void;
    startChapter: number;
    setStartChapter: (value: number) => void;
    numChapters: number;
    setNumChapters: (value: number) => void;
    outputFileName: string;
    setOutputFileName: (value: string) => void;
    onTranslate: () => void;
    onStopTranslation: () => void;
    onDownload: () => void;
    onClearData: () => void;
    isTranslating: boolean;
    hasTranslatedChapters: boolean;
}

export const TranslationForm: React.FC<TranslationFormProps> = ({
    geminiApiKey,
    setGeminiApiKey,
    selectedModel,
    setSelectedModel,
    site,
    setSite,
    seriesUrl,
    setSeriesUrl,
    seriesName,
    setSeriesName,
    startChapter,
    setStartChapter,
    numChapters,
    setNumChapters,
    outputFileName,
    setOutputFileName,
    onTranslate,
    onStopTranslation,
    onDownload,
    onClearData,
    isTranslating,
    hasTranslatedChapters
}) => {
    return (
        <>
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
                {!isTranslating ? (
                    <button id="translateButton" onClick={onTranslate} disabled={isTranslating}>
                        🚀 Start Translation
                    </button>
                ) : (
                    <button id="stopButton" className="stop-button" onClick={onStopTranslation}>
                        ⏹️ Stop Translation
                    </button>
                )}
                <button 
                    id="downloadButton" 
                    onClick={onDownload} 
                    disabled={!hasTranslatedChapters || isTranslating}
                >
                    📚 Download EPUB
                </button>
            </div>

            <div className="clear-data-section">
                <button 
                    className="clear-data-button" 
                    onClick={onClearData} 
                    disabled={isTranslating}
                    title="Clear all saved data including form inputs and translated chapters"
                >
                    🗑️ Clear All Data
                </button>
            </div>
        </>
    );
};
