/**
 * EPUB generation service for creating downloadable ebooks
 */

import type { TranslatedChapter } from './storage';
import type { Glossary } from './types/glossary';

// Declare jEpub as global (loaded via CDN in index.html)
declare global {
    interface Window {
        jEpub: any;
    }
}

/**
 * Generate HTML for the character glossary to be included in EPUB
 */
export const generateGlossaryHTML = (glossary: Glossary): string => {
    if (!glossary || glossary.characters.length === 0) {
        return '<p>No character glossary available.</p>';
    }
    
    // Sort characters by importance, then alphabetically
    const sortedCharacters = [...glossary.characters].sort((a, b) => {
        const importanceOrder = { major: 0, minor: 1, background: 2 };
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (importanceDiff !== 0) return importanceDiff;
        return a.englishName.localeCompare(b.englishName);
    });
    
    const characterEntries = sortedCharacters.map(char => {
        let entry = `<div class="character-entry" style="margin-bottom: 1.5em; padding: 1em; border-left: 3px solid #ddd;">`;
        
        // Character name header
        entry += `<h4 style="margin: 0 0 0.5em 0; color: #333;">${char.englishName}`;
        if (char.japaneseName !== char.englishName) {
            entry += ` <span style="font-weight: normal; color: #666; font-size: 0.9em;">(${char.japaneseName})</span>`;
        }
        entry += `</h4>`;
        
        // Character details
        const details = [];
        if (char.age) details.push(`<strong>Age:</strong> ${char.age}`);
        if (char.physicalAppearance) details.push(`<strong>Appearance:</strong> ${char.physicalAppearance}`);
        
        if (details.length > 0) {
            entry += `<p style="margin: 0.5em 0; font-size: 0.9em; color: #555;">${details.join(' • ')}</p>`;
        }
        
        // Character description
        entry += `<p style="margin: 0.5em 0 0 0; line-height: 1.4;">${char.description}</p>`;
        
        entry += `</div>`;
        return entry;
    }).join('\n');
    
    const glossaryHTML = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 2em;">
            <h2 style="text-align: center; margin-bottom: 1em; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 0.5em;">Character Glossary</h2>
            <div style="margin-bottom: 2em; text-align: center; color: #666; font-size: 0.9em;">
                <p><strong>${glossary.seriesName}</strong></p>
                <p>Chapters ${glossary.chapterRange.start}–${glossary.chapterRange.end} • ${glossary.characters.length} characters</p>
            </div>
            <div class="characters-list">
                ${characterEntries}
            </div>
        </div>`;
    
    return glossaryHTML;
};

/**
 * Convert plain text with formatting markers to HTML for EPUB
 */
export const convertTextToHTML = (text: string): string => {
    if (!text || text.trim() === '') {
        return '<p>No content available.</p>';
    }

    // Normalize line breaks
    let processedText = text.replace(/\r\n/g, '\n');
    
    // Split into paragraphs based on double line breaks
    let paragraphs = processedText.split('\n\n');
    
    // If no double line breaks found, try to intelligently group lines
    if (paragraphs.length === 1) {
        const lines = processedText.split('\n').filter(line => line.trim() !== '');
        paragraphs = [];
        let currentParagraph = '';
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            
            // Start new paragraph if line looks like dialogue or scene break
            if (line.trim().startsWith('"') || line.trim() === '***' || currentParagraph === '') {
                if (currentParagraph) {
                    paragraphs.push(currentParagraph);
                }
                currentParagraph = line;
            } else {
                currentParagraph += '\n' + line;
            }
        }
        
        if (currentParagraph) {
            paragraphs.push(currentParagraph);
        }
    }
    
    // Process each paragraph
    const htmlParagraphs = paragraphs.map(paragraph => {
        let p = paragraph.trim();
        if (!p) return '';
        
        // Handle scene breaks
        if (p === '***' || p === '* * *' || p.match(/^[*\-=]{3,}$/)) {
            return '<div style="text-align: center; margin: 1.5em 0; font-weight: bold; font-size: 1.2em;">***</div>';
        }
        
        // Convert *italics* to <em>
        p = p.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Convert single line breaks within paragraphs to <br>
        p = p.replace(/\n/g, '<br>\n');
        
        // Wrap in paragraph tags
        return `<p style="margin: 0 0 1em 0; line-height: 1.6;">${p}</p>`;
    }).filter(p => p !== '');
    
    return htmlParagraphs.join('\n');
};

/**
 * Extract chapter content for EPUB (title, content, URL)
 */
export const extractChapterContent = (chapter: TranslatedChapter) => {
    const { chapterNumber, translatedText } = chapter;
    
    // Split into lines for processing
    const allLines = translatedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (allLines.length === 0) {
        return {
            title: `Chapter ${chapterNumber}`,
            content: '<p>No content available.</p>',
            url: ''
        };
    }
    
    // Find chapter title (look for [chapter: X] pattern)
    let titleLineIndex = -1;
    let chapterTitle = `Chapter ${chapterNumber}`;
    
    for (let i = 0; i < Math.min(5, allLines.length); i++) {
        if (/\[chapter:\s*\d+\]/i.test(allLines[i])) {
            titleLineIndex = i;
            // Extract title without the [chapter: X] part
            chapterTitle = allLines[i].replace(/\s*\[chapter:\s*\d+\]/i, '').trim();
            if (!chapterTitle) {
                chapterTitle = `Chapter ${chapterNumber}`;
            }
            break;
        }
    }
    
    // Find URL line (usually at the end)
    let urlLineIndex = -1;
    let sourceUrl = '';
    
    for (let i = allLines.length - 1; i >= Math.max(0, allLines.length - 5); i--) {
        if (allLines[i].includes('http') && (allLines[i].includes('syosetu.com') || allLines[i].includes('ncode'))) {
            urlLineIndex = i;
            sourceUrl = allLines[i];
            break;
        }
    }
    
    // Extract content between title and URL
    let startIndex = titleLineIndex >= 0 ? titleLineIndex + 1 : 0;
    let endIndex = urlLineIndex >= 0 ? urlLineIndex : allLines.length;
    
    // Get raw content lines
    const contentLines = allLines.slice(startIndex, endIndex);
    const rawContent = contentLines.join('\n\n'); // Double space for paragraph separation
    
    // Convert to HTML
    const htmlContent = convertTextToHTML(rawContent);
    
    // Format final title
    const finalTitle = `${chapterTitle} - Chapter ${chapterNumber}`;
    
    return {
        title: finalTitle,
        content: htmlContent,
        url: sourceUrl
    };
};

/**
 * Generate and download EPUB file
 */
export const generateAndDownloadEPUB = (
    chapters: TranslatedChapter[],
    fileName: string,
    glossary?: Glossary | null
): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            // Check if jEpub is available
            if (!window.jEpub) {
                throw new Error('jEpub library not loaded. Please refresh the page and try again.');
            }
            
            const epub = window.jEpub;
            
            // Initialize EPUB
            epub.init({
                title: fileName,
                author: 'Web Novel Translator',
                publisher: 'Web Novel Translator App'
            });
            
            // Add glossary first (if available)
            if (glossary && glossary.characters.length > 0) {
                const glossaryHTML = generateGlossaryHTML(glossary);
                epub.add('Character Glossary', glossaryHTML);
            }
            
            // Sort chapters by number
            const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
            
            // Add each chapter to EPUB
            for (const chapter of sortedChapters) {
                const { title, content } = extractChapterContent(chapter);
                epub.add(title, content);
            }
            
            // Generate and download
            epub.generate('blob').then((epubBlob: Blob) => {
                // Create download link
                const url = URL.createObjectURL(epubBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${fileName}.epub`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                resolve();
            }).catch((error: any) => {
                reject(new Error(`EPUB generation failed: ${error.message}`));
            });
            
        } catch (error: any) {
            reject(new Error(`EPUB setup failed: ${error.message}`));
        }
    });
};
