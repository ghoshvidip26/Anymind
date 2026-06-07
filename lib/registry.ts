export const agents = [
    {
        id: "pricing-agent",
        name: "Pricing Agent",
        skills: ["pricing", "shopping"],
        reputation: 92,
        price: 1
    },
    {
        id: "review-agent",
        name: "Review Agent",
        skills: ["reviews"],
        reputation: 89,
        price: 1
    }
]

export function discoverAgents(skill: string) {
    return agents.filter(agent => agent.skills.includes(skill))
}