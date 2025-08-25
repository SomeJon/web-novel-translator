/**
 * EPUB generation service for creating downloadable ebooks
 */

import type { TranslatedChapter } from './storage';
import type { Glossary } from './types/glossary';

// Declare JSZip as global (loaded via CDN in index.html)
declare global {
    interface Window {
        JSZip: any;
        jEpub?: any; // Keep for fallback
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
 * Generate simple title page HTML
 */
const generateTitlePage = (seriesName: string, chapterCount: number): string => {
    return `
    <div style="text-align: center; padding: 4em 2em; font-family: Georgia, serif; line-height: 1.6;">
        <h1 style="font-size: 2.5em; margin: 0 0 1em 0; color: #333; font-weight: normal;">
            ${seriesName}
        </h1>
        
        <p style="font-size: 1.2em; color: #666; margin: 1em 0; font-style: italic;">
            A Japanese Web Novel Translation
        </p>
        
        <p style="font-size: 1.1em; color: #555; margin: 2em 0;">
            ${chapterCount} Chapters
        </p>
        
        <div style="margin-top: 4em; padding-top: 2em; border-top: 1px solid #ddd;">
            <p style="font-size: 1em; color: #888; margin: 0.5em 0;">
                Translated with
            </p>
            <p style="font-size: 1.1em; color: #555; margin: 0.5em 0; font-weight: 600;">
                🌸 Web Novel Translator
            </p>
            <p style="font-size: 0.9em; color: #aaa; margin-top: 2em;">
                Generated on ${new Date().toLocaleDateString()}
            </p>
        </div>
    </div>`;
};

/**
 * Generate simple table of contents HTML
 */
const generateTableOfContents = (chapters: TranslatedChapter[], hasGlossary: boolean, seriesName: string): string => {
    // Sort chapters by number
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    
    let html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 2em; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 2em;">
            <h1 style="font-size: 2em; color: #333; margin: 0 0 0.5em 0; font-weight: normal;">
                Table of Contents
            </h1>
            <p style="font-size: 1em; color: #666; margin: 0; font-style: italic;">
                ${seriesName}
            </p>
        </div>
        
        <div style="margin: 2em 0;">`;
    
    // Group chapters by tens for headers
    const chapterGroups = [];
    for (let i = 0; i < sortedChapters.length; i += 10) {
        chapterGroups.push(sortedChapters.slice(i, i + 10));
    }
    
    chapterGroups.forEach((group, groupIndex) => {
        const startChapter = group[0].chapterNumber;
        const endChapter = group[group.length - 1].chapterNumber;
        
        if (chapterGroups.length > 1) {
            html += `
            <h3 style="font-size: 1.1em; color: #555; margin: ${groupIndex > 0 ? '2em' : '1em'} 0 0.5em 0; padding-bottom: 0.3em; border-bottom: 1px solid #ddd;">
                Chapters ${startChapter} - ${endChapter}
            </h3>`;
        }
        
        group.forEach((chapter) => {
            const { title } = extractChapterContent(chapter);
            const cleanTitle = title.replace(/^Chapter \d+:?\s*/i, '').trim();
            
            html += `
            <p style="margin: 0.3em 0; padding: 0.2em 0;">
                <a href="#chapter${chapter.chapterNumber}" 
                   style="text-decoration: none; color: #333;">
                    <strong>Chapter ${chapter.chapterNumber}:</strong> ${cleanTitle || `Chapter ${chapter.chapterNumber}`}
                </a>
            </p>`;
        });
    });
    
    if (hasGlossary) {
        html += `
        <h3 style="font-size: 1.1em; color: #555; margin: 2em 0 0.5em 0; padding-bottom: 0.3em; border-bottom: 1px solid #ddd;">
            Reference
        </h3>
        <p style="margin: 0.3em 0; padding: 0.2em 0;">
            <a href="#glossary" style="text-decoration: none; color: #333;">
                <strong>📚 Character Glossary</strong>
            </a>
        </p>`;
    }
    
    html += `
        </div>
    </div>`;
    
    return html;
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
            // Check if JSZip is available
            if (!window.JSZip) {
                throw new Error('JSZip library not loaded. Please refresh the page and try again.');
            }
            
            // Create ZIP instance
            const zip = new window.JSZip();
            
            // Sort chapters by number
            const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
            
            // Get series name from glossary or filename
            const seriesName = glossary?.seriesName || fileName;
            const hasGlossary = !!(glossary && glossary.characters.length > 0);
            
            // EPUB required files
            const files: { [key: string]: string } = {};
            
            files['mimetype'] = 'application/epub+zip';
            
            // META-INF/container.xml
            files['META-INF/container.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

            // Generate manifest and spine entries
            let manifestEntries = '';
            let spineEntries = '';
            let tocEntries = '';
            let fileIndex = 1;
            
            // Add title page
            const titlePageHTML = generateTitlePage(seriesName, sortedChapters.length);
            const fullTitlePageHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Title Page</title></head>
<body>${titlePageHTML}</body>
</html>`;
            
            files[`OEBPS/title.xhtml`] = fullTitlePageHTML;
            manifestEntries += `    <item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>\n`;
            spineEntries += `    <itemref idref="title-page"/>\n`;
            tocEntries += `    <navPoint id="navpoint-title" playOrder="${fileIndex}"><navLabel><text>Title Page</text></navLabel><content src="title.xhtml"/></navPoint>\n`;
            fileIndex++;
            
            // Add table of contents
            const tocHTML = generateTableOfContents(sortedChapters, hasGlossary, seriesName);
            const fullTocHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Table of Contents</title></head>
<body>${tocHTML}</body>
</html>`;
            
            files[`OEBPS/toc.xhtml`] = fullTocHTML;
            manifestEntries += `    <item id="table-of-contents" href="toc.xhtml" media-type="application/xhtml+xml"/>\n`;
            spineEntries += `    <itemref idref="table-of-contents"/>\n`;
            tocEntries += `    <navPoint id="navpoint-toc" playOrder="${fileIndex}"><navLabel><text>Table of Contents</text></navLabel><content src="toc.xhtml"/></navPoint>\n`;
            fileIndex++;
            
            // Add chapters
            for (const chapter of sortedChapters) {
                const { title, content } = extractChapterContent(chapter);
                const chapterFileName = `chapter${chapter.chapterNumber}.xhtml`;
                
                // Add navigation at the end of each chapter
                let navigationLinks = `<div style="margin-top: 3em; padding-top: 2em; border-top: 1px solid #ddd; text-align: center;">`;
                navigationLinks += `<a href="toc.xhtml" style="display: inline-block; margin: 0.5em; padding: 0.7em 1.2em; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: normal;">📋 Table of Contents</a>`;
                if (hasGlossary) {
                    navigationLinks += `<a href="glossary.xhtml" style="display: inline-block; margin: 0.5em; padding: 0.7em 1.2em; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; font-weight: normal;">📚 Character Glossary</a>`;
                }
                navigationLinks += `</div>`;
                
                const chapterHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body><a id="chapter${chapter.chapterNumber}"></a><h1>${title}</h1>${content}${navigationLinks}</body>
</html>`;
                
                files[`OEBPS/${chapterFileName}`] = chapterHTML;
                manifestEntries += `    <item id="chapter${chapter.chapterNumber}" href="${chapterFileName}" media-type="application/xhtml+xml"/>\n`;
                spineEntries += `    <itemref idref="chapter${chapter.chapterNumber}"/>\n`;
                tocEntries += `    <navPoint id="navpoint-${chapter.chapterNumber}" playOrder="${fileIndex}"><navLabel><text>${title}</text></navLabel><content src="${chapterFileName}"/></navPoint>\n`;
                fileIndex++;
            }
            
            // Add glossary if available
            if (hasGlossary) {
                const glossaryHTML = generateGlossaryHTML(glossary);
                const navigationBack = `<div style="margin-top: 3em; padding-top: 2em; border-top: 1px solid #ddd; text-align: center;">
<a href="toc.xhtml" style="display: inline-block; margin: 0.5em; padding: 0.7em 1.2em; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: normal;">📋 Back to Table of Contents</a>
</div>`;
                
                const fullGlossaryHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Character Glossary</title></head>
<body><a id="glossary"></a>${glossaryHTML}${navigationBack}</body>
</html>`;
                
                files[`OEBPS/glossary.xhtml`] = fullGlossaryHTML;
                manifestEntries += `    <item id="glossary" href="glossary.xhtml" media-type="application/xhtml+xml"/>\n`;
                spineEntries += `    <itemref idref="glossary"/>\n`;
                tocEntries += `    <navPoint id="navpoint-glossary" playOrder="${fileIndex}"><navLabel><text>Character Glossary</text></navLabel><content src="glossary.xhtml"/></navPoint>\n`;
                fileIndex++;
            }
            
            // OEBPS/content.opf
            files['OEBPS/content.opf'] = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${fileName}</dc:title>
    <dc:creator>Web Novel Translator</dc:creator>
    <dc:publisher>Web Novel Translator App</dc:publisher>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">urn:uuid:${Date.now()}</dc:identifier>
    <meta name="cover" content="cover"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestEntries}  </manifest>
  <spine toc="ncx">
${spineEntries}  </spine>
</package>`;

            // OEBPS/toc.ncx
            files['OEBPS/toc.ncx'] = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${fileName}</text></docTitle>
  <navMap>
${tocEntries}  </navMap>
</ncx>`;
            
            // Add all files to ZIP
            for (const [filePath, content] of Object.entries(files)) {
                if (filePath === 'mimetype') {
                    // Mimetype must be uncompressed and first
                    zip.file(filePath, content, { compression: 'STORE' });
                } else {
                    zip.file(filePath, content);
                }
            }
            
            // Generate EPUB
            zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
                .then((epubBlob: Blob) => {
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
                })
                .catch((error: any) => {
                    reject(new Error(`EPUB generation failed: ${error.message}`));
                });
            
        } catch (error: any) {
            reject(new Error(`EPUB setup failed: ${error.message}`));
        }
    });
};
