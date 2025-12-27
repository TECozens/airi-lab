/**
 * A streaming parser for extracting think/reasoning tags from LLM responses.
 * Handles multiple tag formats used by different Ollama models:
 * - `<think>...</think>` (plain XML)
 * - `` `<think>`...`</think>` `` (markdown code blocks)
 * - `<think>`...`</think>` (markdown code blocks)
 * - `<think>...</think>` (plain XML)
 * 
 * Uses buffering to handle tags that span multiple streaming chunks.
 * 
 * @example
 * const extractor = useThinkTagExtractor()
 * const filtered = extractor.extract('Hello `<think>`reasoning`</think>` world')
 * // filtered: 'Hello  world'
 * // extractor.getExtracted(): 'reasoning'
 */
export function useThinkTagExtractor() {
  let buffer = ''
  let extracted = ''
  let inThinkTag = false
  let tagStartPattern: string | null = null

  // Patterns to match different think tag formats
  // Supports various formats used by different models:
  // - `<think>`...`</think>` (markdown code blocks)
  // - `<think>...</think>` (plain XML)
  // - `<think>`...`</think>` (markdown code blocks)
  // - `<think>...</think>` (plain XML)
  // - `<think>`...`</think>` (markdown code blocks)
  // - `<think>...</think>` (plain XML)
  const OPEN_PATTERNS = [
    '`<think>`',
    '<think>',
    '`<think>`',
    '<think>',
    '`<think>`',
    '<think>',
  ]

  const CLOSE_PATTERNS = [
    '`</think>`',
    '</think>',
    '`</think>`',
    '</think>',
    '`</think>`',
    '</think>',
  ]

  function findTagPattern(text: string, startIndex: number): { pattern: string, index: number } | null {
    let earliestMatch: { pattern: string, index: number } | null = null

    for (let i = 0; i < OPEN_PATTERNS.length; i++) {
      const pattern = OPEN_PATTERNS[i]
      const index = text.indexOf(pattern, startIndex)
      if (index !== -1 && (earliestMatch === null || index < earliestMatch.index)) {
        earliestMatch = { pattern, index }
      }
    }

    return earliestMatch
  }

  function findClosePattern(text: string, startIndex: number, openPattern: string): { pattern: string, index: number } | null {
    const openIndex = OPEN_PATTERNS.indexOf(openPattern)
    if (openIndex === -1)
      return null

    const closePattern = CLOSE_PATTERNS[openIndex]
    const index = text.indexOf(closePattern, startIndex)
    if (index !== -1)
      return { pattern: closePattern, index }

    return null
  }

  return {
    /**
     * Extracts think tags from text and returns filtered text (without think content).
     * Think content is accumulated internally and can be retrieved via getExtracted().
     * @param textPart The chunk of text to process.
     * @returns Filtered text with think tags removed.
     */
    extract(textPart: string): string {
      buffer += textPart
      let filtered = ''
      let i = 0

      while (i < buffer.length) {
        if (!inThinkTag) {
          const match = findTagPattern(buffer, i)
          if (!match) {
            // No think tag found, add remaining text
            filtered += buffer.slice(i)
            buffer = ''
            break
          }

          // Add text before think tag
          filtered += buffer.slice(i, match.index)
          tagStartPattern = match.pattern
          i = match.index + match.pattern.length
          inThinkTag = true
          // eslint-disable-next-line no-console
          console.debug('[ThinkExtractor] Found opening tag:', match.pattern, 'at index', match.index)
        }
        else {
          // Find matching close tag
          const closeMatch = tagStartPattern
            ? findClosePattern(buffer, i, tagStartPattern)
            : null

          if (!closeMatch) {
            // Think tag not closed yet, keep in buffer
            // Keep everything from the start of the opening tag
            const tagStartIndex = i - (tagStartPattern?.length ?? 0)
            buffer = buffer.slice(tagStartIndex)
            break
          }

          // Extract think content (between tags, excluding the opening tag)
          const thinkStart = i
          const thinkEnd = closeMatch.index
          const thinkContent = buffer.slice(thinkStart, thinkEnd)
          extracted += thinkContent
          // eslint-disable-next-line no-console
          console.debug('[ThinkExtractor] Extracted think content chunk:', JSON.stringify(thinkContent))
          // eslint-disable-next-line no-console
          console.debug('[ThinkExtractor] Closing tag:', closeMatch.pattern, 'at index', closeMatch.index)

          // Skip the closing tag completely
          i = closeMatch.index + closeMatch.pattern.length
          inThinkTag = false
          tagStartPattern = null
          
          // Continue processing to capture text AFTER the closing tag
          // Don't break - let the loop continue
        }
      }

      // Update buffer to remove processed content
      if (i > 0 && !inThinkTag) {
        buffer = buffer.slice(i)
      }

      return filtered
    },

    /**
     * Flushes any remaining buffer content.
     * If still in a think tag, treats remaining as think content.
     * Otherwise, returns remaining text as speech.
     */
    flush(): string {
      if (inThinkTag) {
        // If we're still in a think tag when stream ends,
        // everything remaining is think content (excluding the opening tag)
        const tagStartLength = tagStartPattern?.length ?? 0
        const remainingThink = buffer.slice(tagStartLength)
        extracted += remainingThink
        // eslint-disable-next-line no-console
        console.debug('[ThinkExtractor] Flush: Remaining think content:', JSON.stringify(remainingThink))
        buffer = ''
        inThinkTag = false
        tagStartPattern = null
        return ''
      }
      
      // Otherwise, flush any remaining text as speech
      const remaining = buffer
      // eslint-disable-next-line no-console
      console.debug('[ThinkExtractor] Flush: Remaining speech:', JSON.stringify(remaining))
      buffer = ''
      return remaining
    },

    /**
     * Returns all extracted think content accumulated so far.
     */
    getExtracted(): string {
      return extracted
    },

    /**
     * Resets the extractor state for a new message.
     */
    reset(): void {
      buffer = ''
      extracted = ''
      inThinkTag = false
      tagStartPattern = null
    },
  }
}

