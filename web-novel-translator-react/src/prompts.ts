/**
 * Translation prompts for the Web Novel Translator
 * Centralized location for all AI prompts to make them easy to modify
 */

export interface PromptOptions {
    seriesName?: string;
    chapterNumber?: number;
    glossaryContext?: string;
}

/**
 * Generate the main translation prompt with optional series context
 */
export const generateMainTranslationPrompt = (options: PromptOptions = {}): string => {
    const { seriesName, glossaryContext } = options;
    
    const seriesContext = seriesName?.trim() 
        ? `\n\n**SERIES CONTEXT:**\nThis chapter is from the series: "${seriesName}"\nPlease use this series name as context for character name consistency, gender identification, and proper noun translations. Maintain consistent character name spellings and gender pronouns throughout the translation based on this series context.`
        : '';
    
    return `🚨 **CRITICAL:** You MUST start your response with exactly "***TRANSLATION_START***" and end with exactly "***TRANSLATION_END***". This is mandatory!

You are an expert translator and typesetter specializing in web novels. Your task is to translate the web novel chapter from the provided URL into English, following a very strict set of rules for both content and formatting.${seriesContext}${glossaryContext || ''}

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

🚨 **MANDATORY FORMAT - READ CAREFULLY:**
Your response MUST follow this EXACT format:
***TRANSLATION_START***
Chapter Title [chapter: X]
[translated content here]
[source URL]
***TRANSLATION_END***

⚠️ **WARNING:** If you do NOT include both "***TRANSLATION_START***" and "***TRANSLATION_END***" markers, your translation will be rejected and considered failed.

**REMEMBER: Start your response immediately with "***TRANSLATION_START***". No explanations, no process descriptions, no thinking out loud.**

Now, please process the following URL:`;
};

/**
 * Generate the fallback translation prompt for direct Japanese text translation
 */
export const generateFallbackTranslationPrompt = (options: PromptOptions = {}): string => {
    const { seriesName, chapterNumber, glossaryContext } = options;
    
    const seriesContext = seriesName?.trim() 
        ? `\n\n**SERIES CONTEXT:**\nThis chapter is from the series: "${seriesName}"\nPlease use this series name as context for character name consistency, gender identification, and proper noun translations. Maintain consistent character name spellings and gender pronouns throughout the translation based on this series context.`
        : '';
    
    return `🚨 **CRITICAL:** You MUST start your response with exactly "***TRANSLATION_START***" and end with exactly "***TRANSLATION_END***". This is mandatory!

You are an expert translator and typesetter specializing in web novels. Your task is to translate the provided Japanese text into English, following a very strict set of rules for both content and formatting.${seriesContext}${glossaryContext || ''}

**ABSOLUTELY CRITICAL: NO THINKING OR REASONING**
You must NOT show any thinking process, analysis, or reasoning. Your response must contain ONLY the final translated chapter content.

🚨 **MANDATORY FORMAT - READ CAREFULLY:**
Your response MUST follow this EXACT format:
***TRANSLATION_START***
Chapter Title [chapter: X]
[translated content here]
***TRANSLATION_END***

⚠️ **WARNING:** If you do NOT include both "***TRANSLATION_START***" and "***TRANSLATION_END***" markers, your translation will be rejected and considered failed.

**Required Output Format:**
* **Line 1:** The translated chapter title, followed by the chapter number formatted as \`[chapter: ${chapterNumber || 'X'}]\`.
* **Body:** The full, translated text of the chapter's body, formatted according to the detailed rules below.

**Detailed Formatting Rules for the Chapter Body:**
1. **Paragraph Spacing:** Separate every paragraph with a single blank line (i.e., double-spaced). This includes lines of dialogue. This is the most important formatting rule.
2. **Dialogue:** Enclose all spoken dialogue in double quotation marks (\`"..."\`). Every change in speaker must begin on a new, separate paragraph.
3. **Internal Thoughts:** When a character is thinking to themselves (internal monologue), format their thoughts in *italics*.
4. **Scene Breaks:** If the original text uses a line of symbols (like \`………\` or \`* * *\`) to indicate a break in the scene, replace it with a clean, centered \`***\` on its own line, with blank lines above and below it.
5. **Character Consistency:** Pay special attention to maintaining consistent character name spellings and correct gender pronouns throughout the translation.

🚨 **FINAL REMINDER:** Your response MUST start with exactly "***TRANSLATION_START***" followed by the chapter title. No explanations, no process descriptions, no thinking out loud!

Now, please translate the following Japanese text:`;
};

/**
 * Possible start and end markers for translation detection
 */
export const TRANSLATION_MARKERS = {
    START_MARKERS: [
        '***TRANSLATION_START***',
        '{{start}}',
        '{{ start }}',
        '{start}',
        'START:',
        '**START**'
    ],
    END_MARKERS: [
        '***TRANSLATION_END***',
        '{{end}}',
        '{{ end }}',
        '{end}',
        'END:',
        '**END**'
    ]
} as const;
