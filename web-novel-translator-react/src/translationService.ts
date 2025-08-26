/**
 * Translation service for handling Gemini API interactions
 */

import { GoogleGenAI } from '@google/genai';
import { generateMainTranslationPrompt, generateFallbackTranslationPrompt, TRANSLATION_MARKERS } from './prompts';
import type { Glossary } from './types/glossary';
import { formatGlossaryForPrompt } from './services/glossaryService';

export interface TranslationOptions {
    apiKey: string;
    model: string;
    seriesName?: string;
    glossary?: Glossary | null;
}

export interface TranslationResult {
    success: boolean;
    text?: string;
    error?: string;
    fullResponse?: string; // For debugging/fallback
}

/**
 * Custom error class for translation without markers
 */
export class TranslationWithoutMarkersError extends Error {
    public fullText: string;
    
    constructor(fullText: string) {
        super('TRANSLATION_WITHOUT_MARKERS');
        this.name = 'TranslationWithoutMarkersError';
        this.fullText = fullText;
    }
}

/**
 * Extract text between translation markers with flexible detection
 */
export const extractTranslationText = (fullText: string): { success: boolean; text?: string } => {
    // Debug: Log the first and last 200 characters of the response
    console.log(`🔍 Response preview (first 200 chars): "${fullText.substring(0, 200)}..."`);
    console.log(`🔍 Response preview (last 200 chars): "...${fullText.substring(Math.max(0, fullText.length - 200))}"`);
    
    let startIndex = -1;
    let endIndex = -1;
    let usedStartMarker = '';
    let usedEndMarker = '';
    
    // Try to find start marker
    for (const marker of TRANSLATION_MARKERS.START_MARKERS) {
        const index = fullText.toLowerCase().indexOf(marker.toLowerCase());
        if (index !== -1) {
            startIndex = index;
            usedStartMarker = marker;
            break;
        }
    }
    
    // Try to find end marker
    for (const marker of TRANSLATION_MARKERS.END_MARKERS) {
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
            return { success: false };
        }
        
        return { success: true, text: extractedText };
    } else if (startIndex === -1 && endIndex !== -1) {
        // Missing start marker but have end marker - try to find chapter content
        console.warn(`⚠️ Missing start marker but found end marker "${usedEndMarker}". Attempting recovery...`);
        
        // Look for chapter title patterns to find the beginning of the translation
        const beforeEndMarker = fullText.substring(0, endIndex);
        const chapterTitleRegex = /(?:^|\n)\s*([^\n]+\s*\[chapter:\s*\d+\])/i;
        const match = beforeEndMarker.match(chapterTitleRegex);
        
        if (match && match.index !== undefined) {
            const extractedText = beforeEndMarker.substring(match.index).trim();
            console.log(`🔧 Recovery successful! Found chapter title pattern. Length: ${extractedText.length}`);
            
            if (extractedText && extractedText.trim().length > 0) {
                return { success: true, text: extractedText };
            }
        }
        
        console.warn(`❌ Recovery failed - could not find chapter title pattern`);
        return { success: false };
    } else {
        console.warn(`⚠️ No valid markers found in response. Start: ${startIndex !== -1}, End: ${endIndex !== -1}`);
        console.warn(`Tried start markers: ${TRANSLATION_MARKERS.START_MARKERS.join(', ')}`);
        console.warn(`Tried end markers: ${TRANSLATION_MARKERS.END_MARKERS.join(', ')}`);
        return { success: false };
    }
};

/**
 * Translate a single chapter from URL using fresh AI instance
 */
export const translateSingleChapter = async (
    chapterUrl: string,
    options: TranslationOptions
): Promise<TranslationResult> => {
    const { apiKey, model, seriesName, glossary } = options;
    
    // Create a completely fresh AI instance for this chapter only
    let ai: any = null;
    let response: any = null;
    
    try {
        console.log(`🔄 Creating fresh AI instance for: ${chapterUrl}`);
        
        // Fresh AI instance - no history, no state, no memory
        ai = new GoogleGenAI({ apiKey });

        // Fresh configuration for this chapter only - completely isolated
        const tools = [{ urlContext: {} }];
        const glossaryContext = glossary ? formatGlossaryForPrompt(glossary) : undefined;
        const systemPrompt = generateMainTranslationPrompt({ seriesName, glossaryContext });
        
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
            return {
                success: false,
                error: 'Translation returned empty content. The chapter might be blocked or inaccessible.'
            };
        }
        
        // Try to extract text between markers
        const extraction = extractTranslationText(fullText);
        
        if (extraction.success && extraction.text) {
            return {
                success: true,
                text: extraction.text
            };
        } else {
            // If the response looks like a valid translation, offer it as fallback
            if (fullText.includes('[chapter:') || fullText.includes('chapter') || fullText.length > 100) {
                throw new TranslationWithoutMarkersError(fullText);
            } else {
                return {
                    success: false,
                    error: 'Translation markers not found and response doesn\'t appear to be a valid translation.',
                    fullResponse: fullText
                };
            }
        }

    } catch (error) {
        if (error instanceof TranslationWithoutMarkersError) {
            throw error; // Re-throw to be handled by caller
        }
        
        console.error(`❌ Fresh translation failed for ${chapterUrl}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        // Explicitly clear all references to ensure complete cleanup
        ai = null;
        response = null;
        console.log(`🗑️ AI instance destroyed for: ${chapterUrl}`);
    }
};

/**
 * Translate chapter with retry logic
 */
export const translateChapterWithRetry = async (
    chapterUrl: string,
    options: TranslationOptions,
    maxRetries: number = 3
): Promise<TranslationResult> => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            // Each attempt creates a completely independent AI instance
            return await translateSingleChapter(chapterUrl, options);
        } catch (error: any) {
            if (error instanceof TranslationWithoutMarkersError) {
                throw error; // Don't retry, let caller handle
            }
            
            console.error(`🔄 Attempt ${retries + 1} failed for ${chapterUrl}:`, error);
            retries++;
            
            // Check if it's a specific error that we shouldn't retry
            const errorMessage = error.message || error.toString();
            
            // Don't retry certain errors
            if (errorMessage.includes('403') || 
                errorMessage.includes('blocked') || 
                errorMessage.includes('access denied') ||
                errorMessage.includes('ByteString') || 
                errorMessage.includes('character at index') || 
                errorMessage.includes('greater than 255') ||
                errorMessage.includes('empty content') || 
                errorMessage.includes('markers') || 
                errorMessage.includes('inaccessible')) {
                
                console.warn(`🚫 Non-retryable error for ${chapterUrl}, stopping retries`);
                return {
                    success: false,
                    error: `${errorMessage} (non-retryable error)`
                };
            }
            
            if (retries < maxRetries) {
                console.log(`⏳ Waiting 1 second before creating fresh instance for retry ${retries + 1}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    return {
        success: false,
        error: 'Failed to translate chapter after multiple fresh attempts.'
    };
};

/**
 * Translate Japanese text directly (for fallback input)
 */
export const translateJapaneseText = async (
    japaneseText: string,
    chapterNumber: number,
    options: TranslationOptions
): Promise<TranslationResult> => {
    const { apiKey, model, seriesName, glossary } = options;
    
    try {
        const glossaryContext = glossary ? formatGlossaryForPrompt(glossary) : undefined;
        const systemPrompt = generateFallbackTranslationPrompt({ 
            seriesName, 
            chapterNumber,
            glossaryContext 
        });

        const ai = new GoogleGenAI({ apiKey });
        const config = {
            systemInstruction: [{ text: systemPrompt }],
        };
        const contents = [{
            role: 'user',
            parts: [{ text: japaneseText }],
        }];

        const response = await ai.models.generateContentStream({
            model: model,
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

        // Try to extract text between markers
        const extraction = extractTranslationText(fullText);
        
        if (extraction.success && extraction.text) {
            return {
                success: true,
                text: extraction.text
            };
        } else {
            // For fallback translation, be more lenient - return the full text if it looks reasonable
            if (fullText.trim().length > 0) {
                return {
                    success: true,
                    text: fullText.trim()
                };
            } else {
                return {
                    success: false,
                    error: 'Translation returned empty content'
                };
            }
        }

    } catch (error: any) {
        console.error(`❌ Fallback translation failed:`, error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred during fallback translation'
        };
    }
};
