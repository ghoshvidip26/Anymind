export async function execute(workflow: string[], prompt: string) {
    let context = prompt;
    for (const step of workflow) {
        const response = await fetch("http://localhost:3000/api/call-agent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                agentName: step,
                input: context
            })
        })
        context = await response.json();
    }
    return context
}