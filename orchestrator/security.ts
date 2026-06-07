/**
 * Strict, hardcoded prompt injection check (no LLM).
 * Scans queries for typical override, jailbreak, XSS, and SQLi patterns.
 */
export function isPromptInjection(text: string): { detected: boolean; reason?: string } {
    if (!text) return { detected: false };
    
    const lower = text.toLowerCase();
    
    const blockList = [
        "ignore previous",
        "ignore the instructions",
        "ignore instructions",
        "ignore system prompt",
        "ignore all instructions",
        "override rules",
        "override instruction",
        "bypass rules",
        "bypass system",
        "jailbreak",
        "you are now",
        "act as a",
        "system prompt",
        "system instruction",
        "developer mode",
        "dan mode",
        "sudo mode",
        "select * from",
        "drop table",
        "delete from",
        "sql injection",
        "<script>",
        "javascript:",
        "onload=",
        "onerror="
    ];

    for (const pattern of blockList) {
        if (lower.includes(pattern)) {
            return {
                detected: true,
                reason: `Instruction security violation: Pattern '${pattern}' detected.`
            };
        }
    }
    
    return { detected: false };
}
