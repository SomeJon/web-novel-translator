/**
 * Types and interfaces for the character glossary system
 */

export interface Character {
    id: string; // Unique identifier
    japaneseName: string; // Original Japanese name
    englishName: string; // Preferred English name
    age?: string; // Age if mentioned
    gender?: string; // Gender (male/female/other)
    height?: string; // Height if mentioned
    physicalAppearance?: string; // Physical description
    description: string; // 1-2 sentence character description
    importance: 'major' | 'minor' | 'background'; // Character importance level
    firstAppearance?: number; // First chapter they appear in
    occurrenceCount: number; // Number of times character appears across batches
    lastModified: number; // Timestamp for tracking changes
}

export interface GlossarySegment {
    id: string; // Unique identifier for this segment
    characters: Character[];
    seriesName: string;
    chapterRange: {
        start: number;
        end: number;
    };
    segmentNumber: number; // Which segment this is (1, 2, 3, etc.)
    generatedAt: number; // Timestamp when this segment was generated
    lastModified: number; // Timestamp when this segment was last edited
}

export interface GlossaryCollection {
    seriesName: string;
    segments: GlossarySegment[];
    totalChapterRange: {
        start: number;
        end: number;
    };
    createdAt: number;
    lastModified: number;
}

// Keep old Glossary interface for backwards compatibility
export interface Glossary {
    characters: Character[];
    seriesName: string;
    chapterRange: {
        start: number;
        end: number;
    };
    generatedAt: number; // Timestamp when glossary was generated
    lastModified: number; // Timestamp when glossary was last edited
}

export interface GlossaryGenerationOptions {
    apiKey: string;
    model: string;
    seriesName: string;
    chapterUrls: string[];
    chapterRange: {
        start: number;
        end: number;
    };
}

export interface GlossaryGenerationResult {
    success: boolean;
    glossary?: Glossary;
    error?: string;
    rawResponse?: string; // For debugging
}
