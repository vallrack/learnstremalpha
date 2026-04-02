/**
 * Centralized utility to handle malformed JSON strings frequently returned by LLMs.
 * Removes common artifacts like markdown code blocks, trailing commas, and incorrect escapes.
 */
export const robustJSONParse = (str: string): any => {
  if (!str) return {};
  if (typeof str === 'object') return str;

  try {
    return JSON.parse(str);
  } catch (initialError) {
    let cleaned = str.trim();

    // 1. Remove Markdown code blocks if present
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    try {
      // 2. Handle common JSON syntax errors
      // Fix trailing commas in arrays/objects
      let fixed = cleaned.replace(/,\s*([\]}])/g, '$1');
      // Fix bad escaped characters (common in AI responses)
      fixed = fixed.replace(/\\([^"\\\/bfnrtu])/g, '$1'); 
      
      return JSON.parse(fixed);
    } catch (e) {
      // 3. Last Resort: Extraction via Regex and Function Evaluation
      // This handles unquoted keys or other non-standard formats
      try {
        const match = cleaned.match(/\{[\s\S]*\}/);
        const rawStr = match ? match[0] : cleaned;
        // eslint-disable-next-line no-new-func
        return (new Function('return ' + rawStr.replace(/\n/g, " ").replace(/\r/g, "")))();
      } catch (lastResort) {
        console.error('AI Wizard Critical Error:', lastResort, 'Original String:', str);
        throw lastResort;
      }
    }
  }
};
