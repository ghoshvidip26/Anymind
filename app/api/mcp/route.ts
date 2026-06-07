import { NextRequest, NextResponse } from "next/server";
import { pricingAgent } from "@/agents/pricingAgent";
import { shoppingAgent } from "@/agents/shoppingAgent";
import { recommendationAgent } from "@/agents/recommendationAgent";
import { reviewsAgent } from "@/agents/reviewsAgent";
import { dealsAgent } from "@/agents/dealsAgent";
import { shippingAgent } from "@/agents/shippingAgent";

// Define the list of available tools under MCP format
const TOOLS = [
    {
        name: "pricing",
        description: "Looks up and calculates product prices (e.g. laptop prices) based on a query.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "string",
                    description: "Product query or brand description."
                }
            },
            required: ["input"]
        }
    },
    {
        name: "shopping",
        description: "Searches for products based on category, brand, or user intent.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "string",
                    description: "Product search terms or intent description."
                }
            },
            required: ["input"]
        }
    },
    {
        name: "reviews",
        description: "Retrieves and analyzes customer reviews and computes sentiment scores for products.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "object",
                    description: "Product candidates list context or query string."
                }
            },
            required: ["input"]
        }
    },
    {
        name: "deals",
        description: "Searches for coupon codes, rebates, and discount deals for candidate products.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "object",
                    description: "Product candidates list context or query string."
                }
            },
            required: ["input"]
        }
    },
    {
        name: "recommendation",
        description: "Ranks a list of products and outputs the best choice recommendations.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "object",
                    description: "Object containing lists of items to rank/recommend."
                }
            },
            required: ["input"]
        }
    },
    {
        name: "shipping",
        description: "Calculates shipping costs, transit times, and logistics options for product deliveries.",
        inputSchema: {
            type: "object",
            properties: {
                input: {
                    type: "object",
                    description: "Product recommendation or chosen product context."
                }
            },
            required: ["input"]
        }
    }
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Handle standard MCP JSON-RPC 2.0 Protocol
        if (body.jsonrpc === "2.0") {
            const { method, params, id } = body;

            // Handle tools/list
            if (method === "tools/list") {
                return NextResponse.json({
                    jsonrpc: "2.0",
                    result: {
                        tools: TOOLS
                    },
                    id
                });
            }

            // Handle tools/call
            if (method === "tools/call") {
                const { name, arguments: toolArgs } = params || {};
                const input = toolArgs?.input;

                let result;
                switch (name) {
                    case "pricing":
                        result = await pricingAgent(input);
                        break;
                    case "shopping":
                        result = await shoppingAgent(input);
                        break;
                    case "reviews":
                        result = await reviewsAgent(input);
                        break;
                    case "deals":
                        result = await dealsAgent(input);
                        break;
                    case "recommendation":
                        result = await recommendationAgent(input);
                        break;
                    case "shipping":
                        result = await shippingAgent(input);
                        break;
                    default:
                        return NextResponse.json({
                            jsonrpc: "2.0",
                            error: {
                                code: -32601,
                                message: `Tool not found: ${name}`
                            },
                            id
                        }, { status: 404 });
                }

                return NextResponse.json({
                    jsonrpc: "2.0",
                    result: {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result)
                            }
                        ]
                    },
                    id
                });
            }

            // Unknown JSON-RPC method
            return NextResponse.json({
                jsonrpc: "2.0",
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`
                },
                id
            }, { status: 400 });
        }

        // 2. Handle Custom/Direct endpoint format (support user's callMCPTool)
        const { tool, arguments: args } = body;
        if (tool) {
            const input = args?.input || args;
            let result;

            switch (tool) {
                case "pricing":
                    result = await pricingAgent(input);
                    break;
                case "shopping":
                    result = await shoppingAgent(input);
                    break;
                case "reviews":
                    result = await reviewsAgent(input);
                    break;
                case "deals":
                    result = await dealsAgent(input);
                    break;
                case "recommendation":
                    result = await recommendationAgent(input);
                    break;
                case "shipping":
                    result = await shippingAgent(input);
                    break;
                default:
                    return NextResponse.json({ error: `Agent not found: ${tool}` }, { status: 404 });
            }

            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid MCP or direct tool call request format." }, { status: 400 });

    } catch (error) {
        console.error("Error in MCP route handler:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// Support GET requests for standard health checking or listing tools
export async function GET() {
    return NextResponse.json({
        status: "active",
        protocol: "Model Context Protocol (MCP)",
        tools: TOOLS
    });
}
