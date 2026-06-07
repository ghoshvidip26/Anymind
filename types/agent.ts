export interface Agent {
    id: string;
    name: string;
    description: string;
    endpoint: string
    capabilities: string[]
    active: boolean
}