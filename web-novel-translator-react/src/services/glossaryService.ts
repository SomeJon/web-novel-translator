/**
 * Glossary generation service for character analysis and management
 */

import { GoogleGenAI } from '@google/genai';
import type { Character, Glossary, GlossarySegment, GlossaryCollection, GlossaryGenerationOptions, GlossaryGenerationResult } from '../types/glossary';

/**
 * Generate glossary prompt for initial character analysis
 */
export const generateGlossaryPrompt = (seriesName: string, chapterRange: { start: number; end: number }): string => {
    return `You are an expert character analyst specializing in Japanese web novels. Your task is to analyze the original Japanese chapters from "${seriesName}" (chapters ${chapterRange.start}-${chapterRange.end}) and create a comprehensive character glossary for translation purposes.

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process, analysis, or reasoning. Your response must contain ONLY the final JSON glossary.

**ANALYSIS REQUIREMENTS:**

1. **Character Identification:** Find all named characters who appear in the provided original Japanese chapters
2. **Character Information:** Extract ONLY the following for each character:
   - Japanese name (original Japanese text/kanji/kana as it appears)
   - Preferred English name (consistent romanization suitable for translation)
   - VERY brief description (1 sentence MAX for minor/background, 2-3 sentences MAX for major)

3. **Character Limits:**
   - Focus on 5-8 MOST IMPORTANT characters as "major"
   - Include up to 10-15 secondary characters as "minor" 
   - Skip background characters unless they have speaking roles

4. **Description Rules:**
   - **major**: 2-3 sentences maximum describing role and key traits
   - **minor**: 1 sentence maximum describing basic role
   - **background**: Skip entirely unless they speak or affect plot

5. **KEEP IT CONCISE:** This glossary will be used for translation consistency, not comprehensive character analysis

**OUTPUT FORMAT:**
You MUST respond with ONLY a valid JSON object in this exact format:

\`\`\`json
{
  "characters": [
    {
      "japaneseName": "悪役令嬢",
      "englishName": "Villainess",
      "description": "The reincarnated protagonist trying to avoid her bad ending. She's intelligent and uses modern knowledge strategically.",
      "importance": "major"
    },
    {
      "japaneseName": "王子",
      "englishName": "Prince",
      "description": "The kingdom's crown prince.",
      "importance": "minor"
    }
  ]
}
\`\`\`

**CRITICAL RULES:**
- Use consistent English name romanization suitable for translation
- Major characters: Include all available details from Japanese text
- Minor characters: Include basic info and brief description
- Background characters: Name and minimal description only
- NO explanatory text outside the JSON
- NO markdown formatting except for the json code block
- Ensure PERFECTLY VALID JSON syntax - no trailing commas, proper quotes
- All strings must be properly escaped and quoted
- Focus on characters that will appear in translation

Now analyze these original Japanese chapter URLs and create a CONCISE glossary focusing only on the most important characters:`;
};

/**
 * Generate merge glossary prompt for updating existing glossary with new chapters
 */
export const generateMergeGlossaryPrompt = (
    seriesName: string, 
    chapterRange: { start: number; end: number },
    existingGlossary: Glossary
): string => {
    // Only pass essential info to avoid hitting context limits
    const existingCharacters = existingGlossary.characters.slice(0, 20).map(char => ({
        japaneseName: char.japaneseName,
        englishName: char.englishName,
        importance: char.importance,
        occurrenceCount: char.occurrenceCount
        // Skip description to save context space
    }));

    return `You are an expert character analyst. Update an existing glossary for "${seriesName}" by analyzing chapters ${chapterRange.start}-${chapterRange.end}.

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process. Your response must contain ONLY the final JSON glossary.

**EXISTING CHARACTERS (keep these names exactly):**
${JSON.stringify({ characters: existingCharacters }, null, 2)}

**MERGE RULES:**

1. **Existing Characters:** If they appear in new chapters:
   - Keep EXACT same englishName (critical for consistency)
   - Increase occurrenceCount by +1
   - Update description ONLY if major new info (keep it brief)

2. **New Characters:** Only add if they're important:
   - Major: 5-8 most important only (2-3 sentences max)
   - Minor: Secondary with dialogue (1 sentence max)
   - Skip background characters

3. **KEEP IT CONCISE:**
   - Major characters: 2-3 sentences maximum
   - Minor characters: 1 sentence maximum
   - Focus on translation-relevant characters only

4. **Total Limit:** Final glossary should have ~15-25 characters maximum

**OUTPUT FORMAT:**
You MUST respond with ONLY a valid JSON object in this exact format:

\`\`\`json
{
  "characters": [
    {
      "japaneseName": "existing_japanese_name",
      "englishName": "Existing Name", 
      "description": "Brief updated description", 
      "importance": "major",
      "occurrenceCount": 3
    },
    {
      "japaneseName": "new_japanese_name",
      "englishName": "New Character",
      "description": "Brief description",
      "importance": "minor", 
      "occurrenceCount": 1
    }
  ]
}
\`\`\`

**CRITICAL JSON RULES:**
- Ensure PERFECTLY VALID JSON syntax - no trailing commas, proper quotes  
- All strings must be properly escaped and quoted
- NO explanatory text outside the JSON code block

Now analyze these new chapters and merge with existing glossary. Keep it CONCISE - this could be the final batch:`;
};

/**
 * Generate progressive segment prompt for character analysis with previous segments context
 */
export const generateSegmentPrompt = (
    seriesName: string, 
    segmentRange: { start: number; end: number },
    segmentNumber: number,
    previousSegments: GlossarySegment[] = []
): string => {
    let contextSection = '';
    
    if (previousSegments.length > 0) {
        const allPreviousCharacters = previousSegments.flatMap(segment => 
            segment.characters.map(char => ({
                japaneseName: char.japaneseName,
                englishName: char.englishName,
                importance: char.importance,
                description: char.description,
                segmentLastSeen: segment.segmentNumber
            }))
        );
        
        contextSection = `

**PREVIOUS SEGMENTS CONTEXT:**
You have access to character information from previous segments of this series. Use this to:
- Keep the SAME englishName spellings for consistency (CRITICAL)
- Track character development, aging, relationship changes
- Note new roles or status changes
- Update descriptions to reflect current story state

Previous characters:
${JSON.stringify({ characters: allPreviousCharacters.slice(0, 30) }, null, 2)}`;
    }

    return `You are an expert character analyst specializing in Japanese web novels. Analyze chapters ${segmentRange.start}-${segmentRange.end} of "${seriesName}" (Segment ${segmentNumber}) and create a focused character glossary.${contextSection}

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process, analysis, or reasoning. Your response must contain ONLY the final JSON glossary.

**SEGMENT ANALYSIS REQUIREMENTS:**

1. **CHARACTER LIMIT:** Maximum 15 characters total per segment (10 major + 5 minor at most)
2. **DESCRIPTION LIMITS:**
   - Major characters: 15 words maximum per description
   - Minor characters: 8 words maximum per description
   - NO detailed backstories or relationships

3. **Character Details:** Include if mentioned:
   - Age: "16", "adult", "teenager", "elderly" (1-2 words max)
   - Gender: "male", "female", "unknown" (1 word)
   - Height: "tall", "short", "average", "160cm" (1-2 words max)

4. **Character Focus:** Only characters who ACTIVELY speak or act in chapters ${segmentRange.start}-${segmentRange.end}
5. **Character Updates:** For returning characters:
   - Keep EXACT same englishName (critical)
   - Brief status update only (4-6 words)
   - Update age/details if changed
   - Increment occurrenceCount by +1

6. **New Characters:** Only if they have significant dialogue or actions

**LANGUAGE RULES:**
- Descriptions must be ENGLISH ONLY - no Japanese characters mixed in
- Use simple English words only - no specialized terms
- NO quotes around individual words in descriptions (write "main character" not "main"character")
- If unsure of English word, use simpler alternatives

**OUTPUT FORMAT:**
You MUST respond with ONLY a valid JSON object in this exact format:

\`\`\`json
{
  "characters": [
    {
      "japaneseName": "主人公",
      "englishName": "Protagonist",
      "age": "17",
      "gender": "female",
      "height": "average",
      "description": "Now attends academy, more confident",
      "importance": "major",
      "occurrenceCount": 2
    },
    {
      "japaneseName": "新キャラ",
      "englishName": "New Character", 
      "age": "16",
      "gender": "male",
      "description": "Transfer student",
      "importance": "minor",
      "occurrenceCount": 1
    }
  ]
}
\`\`\`

**CRITICAL JSON RULES:**
- Ensure PERFECTLY VALID JSON syntax - no trailing commas, proper quotes  
- All strings must be properly escaped and quoted
- NO explanatory text outside the JSON code block

Now analyze chapters ${segmentRange.start}-${segmentRange.end} and create this segment's glossary:`;
};

/**
 * Parse glossary response from Gemini API
 */
export const parseGlossaryResponse = (
    response: string,
    seriesName: string,
    chapterRange: { start: number; end: number }
): Glossary | null => {
    let jsonText = ''; // Declare outside try block for error logging
    
    try {
        console.log(`🔍 Raw response length: ${response.length}`);
        console.log(`🔍 Raw response preview: "${response.substring(0, 500)}..."`);
        
        // Extract JSON from response (handle code blocks)
        jsonText = response.trim();
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
        } else if (jsonText.includes('```')) {
            // Try to extract content between any code blocks
            const codeBlockMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            }
        }
        
                    // Clean up common JSON issues and mixed language problems
        jsonText = jsonText
            .replace(/^\s*[^{]*/, '') // Remove any text before opening brace
            .replace(/}\s*[^}]*$/, '}') // Remove any text after final closing brace
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/\n\s*/g, ' ') // Remove line breaks and extra spaces
            .replace(/,\s*}/g, '}') // Fix trailing commas before closing brace
            .replace(/,\s*]/g, ']') // Fix trailing commas before closing bracket
            // Fix quotes within string values (like "Duke's"daughter" -> "Duke's daughter")
            .replace(/"([^"]*?)"([^",:}]+?)"([^"]*?)"/g, '"$1$2$3"') // Fix quotes around single words
            .replace(/:\s*"([^"]*?)"([^",:}]+?)"([^",:}]*?)"/g, ': "$1$2$3"') // Fix quotes in values
            .replace(/([^"])([a-zA-Z日本語\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+?)(\s*[,}])/g, '"$2"$3') // Fix unquoted strings with mixed characters
            .replace(/:\s*([^",{}\[\]]+?)(\s*[,}])/g, ': "$1"$2') // Quote unquoted values
            .replace(/"\s*([^"]*?)\s*"/g, '"$1"') // Clean up quoted strings
            .replace(/""\s*""/g, '""'); // Fix double quotes
        
        console.log(`🔧 Cleaned JSON preview: "${jsonText.substring(0, 300)}..."`);
        
        // Parse JSON
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.characters || !Array.isArray(parsed.characters)) {
            console.error('Invalid glossary format: missing characters array');
            return null;
        }
        
        // Transform and validate characters
        const characters: Character[] = parsed.characters.map((char: any, index: number) => {
            const now = Date.now();
            return {
                id: `char-${index}-${now}`, // Generate unique ID
                japaneseName: char.japaneseName || '',
                englishName: char.englishName || char.japaneseName || `Character ${index + 1}`,
                age: char.age || undefined,
                gender: char.gender || undefined,
                height: char.height || undefined,
                physicalAppearance: char.physicalAppearance || undefined,
                description: char.description || 'No description available.',
                importance: ['major', 'minor', 'background'].includes(char.importance) 
                    ? char.importance 
                    : 'minor',
                firstAppearance: chapterRange.start, // Default to start of range
                occurrenceCount: char.occurrenceCount || 1, // Default to 1 if not specified
                lastModified: now
            };
        });
        
        const now = Date.now();
        return {
            characters,
            seriesName,
            chapterRange,
            lastProcessedChapter: chapterRange.end, // Track the last chapter we processed
            generatedAt: now,
            lastModified: now
        };
        
    } catch (error: any) {
        console.error('❌ Error parsing glossary response:', error);
        console.error('🔍 Failed JSON text preview:', jsonText?.substring(0, 500) + '...');
        
        // Try alternative parsing approaches
        try {
            console.log('🔧 Attempting fallback parsing strategies...');
            
            // Strategy 1: Extract and clean characters array only
            const charactersMatch = response.match(/"characters"\s*:\s*\[([\s\S]*?)(?:\]|\}\s*$)/);
            if (charactersMatch) {
                console.log('🔧 Found characters array, attempting to parse...');
                let charactersContent = charactersMatch[1];
                
                // Clean up the characters array content
                charactersContent = charactersContent
                    .replace(/,\s*$/, '') // Remove trailing comma
                    .replace(/,(\s*\])/g, '$1') // Remove trailing commas before array end
                    // Fix the specific quote-in-description problem
                    .replace(/"([^"]*?)"([^",:}]+?)"([^"]*?)"/g, '"$1$2$3"') // Fix quotes around single words
                    .replace(/:\s*"([^"]*?)"([^",:}]+?)"([^",:}]*?)"/g, ': "$1$2$3"') // Fix quotes in values
                    .replace(/([^"])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
                    .replace(/:\s*([^",{}\[\]]+?)(\s*[,}])/g, ': "$1"$2') // Quote unquoted values
                    .replace(/""\s*""/g, '""'); // Fix double quotes
                
                const charactersJson = `{"characters":[${charactersContent}]}`;
                console.log('🔧 Cleaned characters JSON preview:', charactersJson.substring(0, 300) + '...');
                
                const parsed = JSON.parse(charactersJson);
                
                if (parsed.characters && Array.isArray(parsed.characters)) {
                    console.log('✅ Successfully parsed characters array as fallback');
                    const characters: Character[] = parsed.characters
                        .filter((char: any) => char && (char.japaneseName || char.englishName)) // Filter out invalid entries
                        .map((char: any, index: number) => {
                                                const now = Date.now();
                        // Clean description of any Japanese characters
                        let cleanDescription = (char.description || 'No description available.')
                            .replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '') // Remove Japanese characters
                            .replace(/\s+/g, ' ') // Normalize spaces
                            .trim();
                        
                        if (!cleanDescription || cleanDescription.length < 5) {
                            cleanDescription = 'Character description unavailable.';
                        }

                        return {
                            id: `char-${index}-${now}`,
                            japaneseName: char.japaneseName || '',
                            englishName: char.englishName || char.japaneseName || `Character ${index + 1}`,
                            age: char.age || undefined,
                            gender: char.gender || undefined,
                            height: char.height || undefined,
                            physicalAppearance: char.physicalAppearance || undefined,
                            description: cleanDescription,
                            importance: ['major', 'minor', 'background'].includes(char.importance)
                                ? char.importance
                                : 'minor',
                            firstAppearance: chapterRange.start,
                            occurrenceCount: char.occurrenceCount || 1,
                            lastModified: now
                        };
                    });
                    
                    const now = Date.now();
                    return {
                        characters,
                        seriesName,
                        chapterRange,
                        lastProcessedChapter: chapterRange.end,
                        generatedAt: now,
                        lastModified: now
                    };
                }
            }
        } catch (fallbackError) {
            console.error('❌ Fallback parsing also failed:', fallbackError);
        }
        
        return null;
    }
};

/**
 * Generate progressive glossary segments from chapter URLs
 */
export const generateGlossarySegments = async (
    options: GlossaryGenerationOptions
): Promise<{ success: boolean; collection?: GlossaryCollection; error?: string }> => {
    const { apiKey, model, seriesName, chapterUrls, chapterRange } = options;
    const segmentSize = 10; // 10 chapters per segment
    const totalChapters = chapterUrls.length;
    const totalSegments = Math.ceil(totalChapters / segmentSize);
    
    console.log(`🔄 Generating ${totalSegments} glossary segments for ${seriesName} (${segmentSize} chapters each)`);
    
    const segments: GlossarySegment[] = [];
    
    try {
        for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex++) {
            const segmentNumber = segmentIndex + 1;
            const startIdx = segmentIndex * segmentSize;
            const endIdx = Math.min(startIdx + segmentSize, totalChapters);
            const segmentUrls = chapterUrls.slice(startIdx, endIdx);
            
            const segmentChapterStart = chapterRange.start + startIdx;
            const segmentChapterEnd = chapterRange.start + endIdx - 1;
            const segmentRange = { start: segmentChapterStart, end: segmentChapterEnd };
            
            console.log(`📖 Generating segment ${segmentNumber}/${totalSegments}: chapters ${segmentChapterStart}-${segmentChapterEnd}`);
            
            const ai = new GoogleGenAI({ apiKey });
            
            // Generate prompt with previous segments as context
            const systemPrompt = generateSegmentPrompt(seriesName, segmentRange, segmentNumber, segments);
            
            // Prepare the message with segment URLs
            const urlList = segmentUrls.map((url, index) => 
                `Chapter ${segmentChapterStart + index}: ${url}`
            ).join('\n');
            
            const userMessage = `Please analyze this segment and generate a focused character glossary:\n\n${urlList}`;
            
            const config = {
                tools: [{ urlContext: {} }],
                systemInstruction: [{ text: systemPrompt }],
            };
            
            const contents = [{
                role: 'user',
                parts: [{ text: userMessage }],
            }];
            
            console.log(`📤 Sending segment ${segmentNumber} request with ${segmentUrls.length} chapter URLs`);
            
            // Add longer delay and retry logic for rate limits
            let retryCount = 0;
            let response: any = null;
            const maxRetries = 3;
            
            while (retryCount <= maxRetries) {
                try {
                    response = await ai.models.generateContentStream({
                        model: model,
                        config,
                        contents,
                    });
                    break; // Success, exit retry loop
                } catch (error: any) {
                    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate')) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            const delay = Math.min(60000, 15000 * Math.pow(2, retryCount - 1)); // Exponential backoff up to 60s
                            console.log(`⏳ Rate limit hit. Retry ${retryCount}/${maxRetries} in ${delay/1000}s...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    }
                    throw error; // Re-throw if not rate limit or max retries exceeded
                }
            }
            
            if (!response) {
                console.warn(`⚠️ Segment ${segmentNumber} failed after ${maxRetries} retries.`);
                continue; // Skip this segment
            }
            
            // Extract text from response
            let fullText = '';
            for await (const chunk of response) {
                if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
                    const chunkText = chunk.candidates[0].content.parts.map((part: any) => part.text).join('');
                    fullText += chunkText;
                }
            }
            
            console.log(`✅ Segment ${segmentNumber} completed. Response length: ${fullText.length}`);
            
            if (!fullText || fullText.trim().length === 0) {
                console.warn(`⚠️ Segment ${segmentNumber} returned empty content.`);
                continue; // Skip this segment but continue with others
            }
            
            // Parse the response for this segment
            const segmentGlossary = parseGlossaryResponse(fullText, seriesName, segmentRange);
            
            if (segmentGlossary) {
                // Convert to GlossarySegment
                const segment: GlossarySegment = {
                    id: `segment-${segmentNumber}-${Date.now()}`,
                    characters: segmentGlossary.characters,
                    seriesName,
                    chapterRange: segmentRange,
                    segmentNumber,
                    generatedAt: Date.now(),
                    lastModified: Date.now()
                };
                
                segments.push(segment);
                console.log(`📚 Segment ${segmentNumber} processed: ${segment.characters.length} characters`);
            } else {
                console.warn(`⚠️ Failed to parse segment ${segmentNumber} response.`);
            }
            
            // Add longer delay between segments to respect rate limits
            if (segmentIndex < totalSegments - 1) {
                const delaySeconds = model.includes('gemini-2.5-pro') ? 35 : 8; // Longer delay for pro model
                console.log(`⏳ Waiting ${delaySeconds} seconds before next segment (rate limit protection)...`);
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            }
        }
        
        if (segments.length === 0) {
            return {
                success: false,
                error: 'No segments were successfully generated'
            };
        }
        
        // Create the collection
        const collection: GlossaryCollection = {
            seriesName,
            segments,
            totalChapterRange: chapterRange,
            lastProcessedChapter: chapterRange.start + (segments.length * segmentSize) - 1,
            createdAt: Date.now(),
            lastModified: Date.now()
        };
        
        console.log(`🎉 Generated ${segments.length}/${totalSegments} glossary segments successfully!`);
        
        return {
            success: true,
            collection
        };
        
    } catch (error: any) {
        console.error('❌ Segment glossary generation failed:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred during segment generation'
        };
    }
};

/**
 * Generate character glossary from chapter URLs using batching (legacy method)
 */
export const generateGlossary = async (
    options: GlossaryGenerationOptions
): Promise<GlossaryGenerationResult> => {
    const { apiKey, model, seriesName, chapterUrls, chapterRange } = options;
    const batchSize = 10; // Process 10 chapters at a time
    
    try {
        console.log(`🔄 Generating glossary for ${seriesName} chapters ${chapterRange.start}-${chapterRange.end} using batching`);
        
        let currentGlossary: Glossary | null = null;
        const totalBatches = Math.ceil(chapterUrls.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIdx = batchIndex * batchSize;
            const endIdx = Math.min(startIdx + batchSize, chapterUrls.length);
            const batchUrls = chapterUrls.slice(startIdx, endIdx);
            
            const batchStart = chapterRange.start + startIdx;
            const batchEnd = chapterRange.start + endIdx - 1;
            const batchChapterRange = { start: batchStart, end: batchEnd };
            
            console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches}: chapters ${batchStart}-${batchEnd}`);
            
            const ai = new GoogleGenAI({ apiKey });
            
            // Choose prompt based on whether we have existing glossary
            const systemPrompt = currentGlossary 
                ? generateMergeGlossaryPrompt(seriesName, batchChapterRange, currentGlossary)
                : generateGlossaryPrompt(seriesName, batchChapterRange);
            
            // Prepare the message with batch URLs
            const urlList = batchUrls.map((url, index) => 
                `Chapter ${batchStart + index}: ${url}`
        ).join('\n');
        
            const userMessage = currentGlossary
                ? `Please analyze these new chapters and merge with the existing glossary:\n\n${urlList}`
                : `Please analyze these chapters and generate a character glossary:\n\n${urlList}`;
        
        const config = {
                tools: [{ urlContext: {} }], // Enable URL context for batch URLs
            systemInstruction: [{ text: systemPrompt }],
        };
        
        const contents = [{
            role: 'user',
            parts: [{ text: userMessage }],
        }];
        
            console.log(`📤 Sending batch ${batchIndex + 1} request with ${batchUrls.length} chapter URLs`);
        
        // Make the API call
        const response = await ai.models.generateContentStream({
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
        
            console.log(`✅ Batch ${batchIndex + 1} completed. Response length: ${fullText.length}`);
        
        if (!fullText || fullText.trim().length === 0) {
                console.warn(`⚠️ Batch ${batchIndex + 1} returned empty content. This may be due to API limits or processing issues.`);
                
                // If we have a previous glossary and this isn't the first batch, use what we have
                if (currentGlossary && batchIndex > 0) {
                    console.log(`📚 Using previous glossary from batch ${batchIndex}. Final glossary has ${currentGlossary.characters.length} characters`);
                    return {
                        success: true,
                        glossary: currentGlossary
                    };
                } else {
            return {
                success: false,
                        error: `Batch ${batchIndex + 1} returned empty content and no previous glossary available.`,
                rawResponse: fullText
                    };
                }
            }
            
            // Parse the response for this batch
            const batchGlossary = parseGlossaryResponse(fullText, seriesName, chapterRange);
            
            if (!batchGlossary) {
                console.warn(`⚠️ Failed to parse batch ${batchIndex + 1} response.`);
                
                // If we have a previous glossary and this isn't the first batch, use what we have
                if (currentGlossary && batchIndex > 0) {
                    console.log(`📚 Parse failed but using previous glossary from batch ${batchIndex}. Final glossary has ${currentGlossary.characters.length} characters`);
                    return {
                        success: true,
                        glossary: currentGlossary
                    };
                } else {
                    return {
                        success: false,
                        error: `Failed to parse glossary from batch ${batchIndex + 1} and no previous glossary available.`,
                        rawResponse: fullText.substring(0, 500) + "..." // Limit error response length
                    };
                }
            }
            
            // Update current glossary with batch results and track progress
            currentGlossary = {
                ...batchGlossary,
                lastProcessedChapter: batchEnd // Update to show actual progress
            };
            console.log(`📚 Batch ${batchIndex + 1} processed: ${batchGlossary.characters.length} total characters (through chapter ${batchEnd})`);
            
            // Add small delay between batches to be nice to the API
            if (batchIndex < totalBatches - 1) {
                console.log('⏳ Waiting 2 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (currentGlossary) {
            console.log(`🎉 Glossary generation completed! Final glossary has ${currentGlossary.characters.length} characters`);
            return {
                success: true,
                glossary: currentGlossary
            };
        } else {
            return {
                success: false,
                error: 'No glossary was generated from any batch'
            };
        }
        
    } catch (error: any) {
        console.error('❌ Batch glossary generation failed:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred during batch glossary generation'
        };
    }
};

/**
 * Format glossary for use in translation prompts
 */
export const formatGlossaryForPrompt = (glossary: Glossary): string => {
    if (glossary.characters.length === 0) {
        return '';
    }
    
    const characterList = glossary.characters
        .sort((a, b) => {
            // Sort by importance first, then alphabetically
            const importanceOrder = { major: 0, minor: 1, background: 2 };
            const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
            if (importanceDiff !== 0) return importanceDiff;
            return a.englishName.localeCompare(b.englishName);
        })
        .map(char => {
            let entry = `• ${char.englishName}`;
            if (char.japaneseName !== char.englishName) {
                entry += ` (${char.japaneseName})`;
            }
            if (char.age) {
                entry += ` - Age: ${char.age}`;
            }
            if (char.physicalAppearance) {
                entry += ` - Appearance: ${char.physicalAppearance}`;
            }
            entry += ` - ${char.description}`;
            return entry;
        })
        .join('\n');
    
    return `\n\n**CHARACTER GLOSSARY:**\nUse these character names and details consistently throughout the translation:\n${characterList}`;
};

/**
 * Update a character in the glossary
 */
export const updateCharacterInGlossary = (
    glossary: Glossary,
    characterId: string,
    updates: Partial<Character>
): Glossary => {
    const updatedCharacters = glossary.characters.map(char => 
        char.id === characterId 
            ? { ...char, ...updates, lastModified: Date.now() }
            : char
    );
    
    return {
        ...glossary,
        characters: updatedCharacters,
        lastProcessedChapter: glossary.lastProcessedChapter || glossary.chapterRange.end, // Backwards compatibility
        lastModified: Date.now()
    };
};

/**
 * Add a new character to the glossary
 */
export const addCharacterToGlossary = (
    glossary: Glossary,
    character: Omit<Character, 'id' | 'lastModified'>
): Glossary => {
    const now = Date.now();
    const newCharacter: Character = {
        ...character,
        id: `char-${now}-${Math.random().toString(36).substr(2, 9)}`,
        occurrenceCount: character.occurrenceCount || 1, // Default to 1 for manually added characters
        lastModified: now
    };
    
    return {
        ...glossary,
        characters: [...glossary.characters, newCharacter],
        lastProcessedChapter: glossary.lastProcessedChapter || glossary.chapterRange.end, // Backwards compatibility
        lastModified: now
    };
};

/**
 * Remove a character from the glossary
 */
export const removeCharacterFromGlossary = (
    glossary: Glossary,
    characterId: string
): Glossary => {
    return {
        ...glossary,
        characters: glossary.characters.filter(char => char.id !== characterId),
        lastProcessedChapter: glossary.lastProcessedChapter || glossary.chapterRange.end, // Backwards compatibility
        lastModified: Date.now()
    };
};
