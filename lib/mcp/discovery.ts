export async function discoverAgents(
    query: string
) {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/agents/list`
    );
    const data = await response.json();
    return data.agents;
}