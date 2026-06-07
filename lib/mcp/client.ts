export async function callMCPTool(endpoint: string, toolName: string, args: any) {
    try {
        // Try standard JSON-RPC 2.0 format (for standard MCP hosts/HasMCP)
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: args
                },
                id: Date.now()
            })
        });

        const data = await response.json();
        
        if (data.jsonrpc === "2.0" && data.result) {
            if (data.result.content && Array.isArray(data.result.content)) {
                const textContent = data.result.content.find((c: any) => c.type === "text");
                if (textContent) {
                    try {
                        return JSON.parse(textContent.text);
                    } catch {
                        return textContent.text;
                    }
                }
            }
            return data.result;
        }

        return data;

    } catch (error) {
        console.warn("[MCP Client] Standard JSON-RPC call failed or unsupported, trying fallback custom format:", error);
        
        // Fallback to custom/direct format
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tool: toolName,
                arguments: args
            })
        });
        return response.json();
    }
}