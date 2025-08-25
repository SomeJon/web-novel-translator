/**
 * Local storage utilities for persisting application data
 */

import type { Glossary, GlossaryCollection } from './types/glossary';

export interface TranslatedChapter {
    chapterNumber: number;
    translatedText: string;
}

/**
 * Storage keys for the Web Novel Translator app
 */
export const STORAGE_KEYS = {
    GEMINI_API_KEY: 'wnt_gemini_api_key',
    SELECTED_MODEL: 'wnt_selected_model',
    SITE: 'wnt_site',
    SERIES_URL: 'wnt_series_url',
    SERIES_NAME: 'wnt_series_name',
    START_CHAPTER: 'wnt_start_chapter',
    NUM_CHAPTERS: 'wnt_num_chapters',
    OUTPUT_FILE_NAME: 'wnt_output_file_name',
    TRANSLATED_CHAPTERS: 'wnt_translated_chapters',
    GLOSSARY: 'wnt_glossary', // Legacy single glossary
    GLOSSARY_COLLECTION: 'wnt_glossary_collection', // New segmented glossary
    GLOSSARY_START_CHAPTER: 'wnt_glossary_start_chapter', // Separate range for glossary generation
    GLOSSARY_NUM_CHAPTERS: 'wnt_glossary_num_chapters'
} as const;

/**
 * Load a value from localStorage with error handling and type safety
 */
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error loading ${key} from localStorage:`, error);
        return defaultValue;
    }
};

/**
 * Save a value to localStorage with error handling
 */
export const saveToStorage = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error saving ${key} to localStorage:`, error);
    }
};

/**
 * Clear all application data from localStorage
 */
export const clearAllStorage = (): void => {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.warn('Error clearing localStorage:', error);
    }
};

/**
 * Application state interface for localStorage
 */
export interface AppState {
    geminiApiKey: string;
    selectedModel: string;
    site: string;
    seriesUrl: string;
    seriesName: string;
    startChapter: number;
    numChapters: number;
    outputFileName: string;
    translatedChapters: TranslatedChapter[];
    glossary: Glossary | null; // Legacy
    glossaryCollection: GlossaryCollection | null; // New segmented glossary
    glossaryStartChapter: number; // Separate range for glossary generation
    glossaryNumChapters: number;
}

/**
 * Load the complete application state from localStorage
 */
export const loadAppState = (): AppState => {
    return {
        geminiApiKey: loadFromStorage(STORAGE_KEYS.GEMINI_API_KEY, ''),
        selectedModel: loadFromStorage(STORAGE_KEYS.SELECTED_MODEL, 'gemini-2.5-flash'),
        site: loadFromStorage(STORAGE_KEYS.SITE, 'syosetu'),
        seriesUrl: loadFromStorage(STORAGE_KEYS.SERIES_URL, ''),
        seriesName: loadFromStorage(STORAGE_KEYS.SERIES_NAME, ''),
        startChapter: loadFromStorage(STORAGE_KEYS.START_CHAPTER, 1),
        numChapters: loadFromStorage(STORAGE_KEYS.NUM_CHAPTERS, 1),
        outputFileName: loadFromStorage(STORAGE_KEYS.OUTPUT_FILE_NAME, 'translated_novel'),
        translatedChapters: loadFromStorage(STORAGE_KEYS.TRANSLATED_CHAPTERS, []),
        glossary: loadFromStorage(STORAGE_KEYS.GLOSSARY, null), // Legacy
        glossaryCollection: loadFromStorage(STORAGE_KEYS.GLOSSARY_COLLECTION, null), // New
        glossaryStartChapter: loadFromStorage(STORAGE_KEYS.GLOSSARY_START_CHAPTER, 1),
        glossaryNumChapters: loadFromStorage(STORAGE_KEYS.GLOSSARY_NUM_CHAPTERS, 10)
    };
};

/**
 * Save individual state values to localStorage
 */
export const saveStateValue = <K extends keyof AppState>(
    key: K,
    value: AppState[K]
): void => {
    const storageKey = {
        geminiApiKey: STORAGE_KEYS.GEMINI_API_KEY,
        selectedModel: STORAGE_KEYS.SELECTED_MODEL,
        site: STORAGE_KEYS.SITE,
        seriesUrl: STORAGE_KEYS.SERIES_URL,
        seriesName: STORAGE_KEYS.SERIES_NAME,
        startChapter: STORAGE_KEYS.START_CHAPTER,
        numChapters: STORAGE_KEYS.NUM_CHAPTERS,
        outputFileName: STORAGE_KEYS.OUTPUT_FILE_NAME,
        translatedChapters: STORAGE_KEYS.TRANSLATED_CHAPTERS,
        glossary: STORAGE_KEYS.GLOSSARY,
        glossaryCollection: STORAGE_KEYS.GLOSSARY_COLLECTION,
        glossaryStartChapter: STORAGE_KEYS.GLOSSARY_START_CHAPTER,
        glossaryNumChapters: STORAGE_KEYS.GLOSSARY_NUM_CHAPTERS
    }[key];
    
    saveToStorage(storageKey, value);
};
