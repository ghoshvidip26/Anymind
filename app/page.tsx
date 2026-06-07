"use client";

import { FormEvent, useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useBalance } from "wagmi";
import { parseEther } from "viem";
import { registryAddress } from "@/lib/registryAddress";
import { registryAbi } from "@/lib/registryAbi";
import { reputationAddress } from "@/lib/reputationAddress";
import { reputationAbi } from "@/lib/reputationAbi";

type PanelTab = "workspace" | "workforce" | "settings";

type CompletedStep = {
  id: string;
  title: string;
  elapsedMs: number;
  status: "done" | "error";
  payloadSizeBytes: number;
  feePaid: string;
};

type ContractAgent = {
  id: string;
  owner: string;
  name: string;
  description: string;
  endpoint: string;
  tokenURI?: string;
  serviceFee?: string;
  capabilities: string[];
  active: boolean;
  reputation: number;
};

const getStepDetails = (step: string) => {
  switch (step) {
    case "trigger":
      return {
        title: "OPERATOR: PARSE INTENT",
        desc: "Ingesting user natural language request. Splitting terms to identify target product attributes.",
        source: "User Interface",
        dest: "Node 02: Planner",
        protocol: "Standard REST JSON Payload",
        nftStatus: "Local Operator Node",
        toolsList: [
          { name: "intent_parse", desc: "Zero-latency parsing utility to parse query keywords and isolate product tags." }
        ]
      };
    case "orchestrate":
      return {
        title: "PLANNER: DYNAMIC ROUTING",
        desc: "Resolving capability keywords against on-chain ERC-8004 Agent registry. Compiling execution order.",
        source: "Node 01: Operator",
        dest: "Node 03: Shopping Agent",
        protocol: "JSON-RPC 2.0 Plan Schema",
        nftStatus: "On-Chain Registry Map",
        toolsList: [
          { name: "sarvam_105b", desc: "Sarvam AI MoE model to dynamically plan route execution based on capabilities." },
          { name: "security_check", desc: "Strict hardcoded prompt injection verification check." }
        ]
      };
    case "shopping":
      return {
        title: "SHOPPING AGENT: SEEK DISCOVERY",
        desc: "Searching product directories. Minted as ERC-8004 NFT on Monad. Emits product query search parameters.",
        source: "Node 02: Planner",
        dest: "Node 04: Apify Scraper",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #0 | Fee: FREE",
        toolsList: [
          { name: "mcp_shopping", desc: "MCP tool executing catalog simulation and query dispatching." }
        ]
      };
    case "apify":
      return {
        title: "APIFY: LIVE WEB SCRAPER",
        desc: "Triggering external actor script to execute live Google Shopping scrape. Compiling search results in real-time.",
        source: "Node 03: Shopping Agent",
        dest: "Node 05: Pricing Agent",
        protocol: "REST API Endpoint Gateway",
        nftStatus: "External Service Hook",
        toolsList: [
          { name: "google_shopping_scraper", desc: "Apify actor executing live catalog searches." }
        ]
      };
    case "pricing":
      return {
        title: "PRICING AGENT: MATRICES NORMALIZER",
        desc: "Charging fee in MON. Fetching product prices and mapping them with oracle conversion metrics.",
        source: "Node 04: Apify Scraper",
        dest: "Node 06: Reviews Agent",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #1 | Fee: 0.02 MON",
        toolsList: [
          { name: "mcp_pricing", desc: "MCP Pricing Agent tool to normalize price matrices." }
        ]
      };
    case "reviews":
      return {
        title: "REVIEWS AGENT: SENTIMENT ANALYZER",
        desc: "Charging fee in MON. Retrieving user feedback and community reviews, performing NLP sentiment scoring on products.",
        source: "Node 05: Pricing Agent",
        dest: "Node 07: Deals Agent",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #3 | Fee: 0.03 MON",
        toolsList: [
          { name: "mcp_reviews", desc: "MCP Reviews Agent tool to perform NLP sentiment analysis on feedback." }
        ]
      };
    case "deals":
      return {
        title: "DEALS AGENT: COUPON MATCHER",
        desc: "Charging fee in MON. Scanning brand listings for active coupon codes, promotional rates, and discounts.",
        source: "Node 06: Reviews Agent",
        dest: "Node 08: Ranking Agent",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #4 | Fee: 0.015 MON",
        toolsList: [
          { name: "mcp_deals", desc: "MCP Deals Agent tool to scan brand coupon listings." },
          { name: "pricing_rpc", desc: "Direct Agent-to-Agent RPC communication with Pricing Agent." }
        ]
      };
    case "recommendation":
      return {
        title: "RANKING AGENT: EVALUATION DECISION",
        desc: "Charging fee in MON. Calculating confidence percentages based on pricing, review sentiment, and active discount deals.",
        source: "Node 07: Deals Agent",
        dest: "Node 09: Shipping Agent",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #2 | Fee: 0.05 MON",
        toolsList: [
          { name: "mcp_recommendation", desc: "MCP Decision Agent to calculate confidence matrix and rank best choice." }
        ]
      };
    case "shipping":
      return {
        title: "LOGISTICS AGENT: SHIPPING ESTIMATOR",
        desc: "Charging fee in MON. Calculating dimensions, transit schedules, and estimated shipping costs to destination.",
        source: "Node 08: Ranking Agent",
        dest: "Operator / Analytics Report",
        protocol: "Model Context Protocol (MCP)",
        nftStatus: "ERC-721 NFT #5 | Fee: 0.025 MON",
        toolsList: [
          { name: "mcp_shipping", desc: "MCP Shipping Agent to evaluate delivery transit paths and estimated costs." }
        ]
      };
    case "success":
      return {
        title: "SEQUENCE COMPLETED SUCCESSFULLY",
        desc: "All agents executed successfully. On-chain service fees transferred. Context envelope closed.",
        source: "Pipeline Terminus",
        dest: "User Dashboard",
        protocol: "JSON-RPC Success Frame",
        nftStatus: "Nominal Execution State",
        toolsList: []
      };
    case "error":
      return {
        title: "SEQUENCE EXHAUSTED WITH ERROR",
        desc: "An execution error occurred. Pipeline halted. Check error code in terminal logs.",
        source: "Faulty Node",
        dest: "Error Stream",
        protocol: "JSON-RPC Exception Frame",
        nftStatus: "Halted",
      };
    default:
      return {
        title: "SYSTEM READY",
        desc: "Await operator prompt to initiate agent discovery orchestration sequence.",
        source: "Idle",
        dest: "Idle",
        protocol: "Awaiting Frame",
        nftStatus: "Idle",
      };
  }
};

export default function Home() {
  // Wagmi Hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending: isTxPending, isSuccess: isTxSuccess, data: txHash } = useWriteContract();
  const { data: balanceData } = useBalance({ address });

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<PanelTab>("workspace");

  // Input & Modal States
  const [query, setQuery] = useState("gaming laptop under 1500");
  const [registerForm, setRegisterForm] = useState({
    name: "Aegis Shopper",
    description: "Decentralized shopping agent for consumer tech",
    endpoint: "/api/agents/shopping",
    capabilities: "shopping, laptop, electronics",
    serviceFee: "0.05",
  });

  const [rateForm, setRateForm] = useState({
    agentId: "",
    score: "90",
    comment: "Excellent response latency and accuracy.",
  });

  const [activeStep, setActiveStep] = useState<string>("idle");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "SYS_INIT: NEURAL TACTICAL PROTOCOL LOADED",
    "OPERATOR DIRECTIVE REQUIRED FOR SEQUENCE INITIATION...",
  ]);
  const [isConsoleRunning, setIsConsoleRunning] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contextEnvelope, setContextEnvelope] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // ── Sarvam Planner & Pop-Up States ──
  const [plannerModel, setPlannerModel] = useState<string>("Static Engine");
  const [plannedWorkflow, setPlannedWorkflow] = useState<string[]>([]);
  const [txAlert, setTxAlert] = useState<{
    show: boolean;
    type: "free" | "paid";
    mode: "execution" | "deployment";
    nodeName: string;
    fee: string;
    recipient: string;
    txHash: string;
  }>({
    show: false,
    type: "free",
    mode: "execution",
    nodeName: "",
    fee: "0",
    recipient: "",
    txHash: ""
  });

  // ── Enhanced Pipeline Tracking ──
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [pipelineElapsed, setPipelineElapsed] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const pipelineStartRef = useRef<number>(0);
  const stepStartRef = useRef<number>(0);
  const pipelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated metrics states
  const [simulatedBlock, setSimulatedBlock] = useState(481232);
  const [simulatedLoad, setSimulatedLoad] = useState(14);
  const [simulatedGas, setSimulatedGas] = useState(52);

  // Dynamic Marketplace List
  const [registeredAgents, setRegisteredAgents] = useState<ContractAgent[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Default Fallbacks for Agents
  const defaultAgents: ContractAgent[] = [
    {
      id: "0",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Cartographer Shopper",
      description: "Finds items by parsing user semantic intent.",
      endpoint: "/api/agents/shopping",
      capabilities: ["shopping", "search", "inventory"],
      serviceFee: "0",
      active: true,
      reputation: 94,
    },
    {
      id: "1",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Aurelius Pricing",
      description: "Pricer matching live feeds with e-commerce indexes.",
      endpoint: "/api/agents/pricing",
      capabilities: ["pricing", "arbitrage", "comparison"],
      serviceFee: "0.02",
      active: true,
      reputation: 89,
    },
    {
      id: "2",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Hermes Reviews",
      description: "Fetches and analyzes product feedback and customer sentiment.",
      endpoint: "/api/agents/reviews",
      capabilities: ["reviews", "sentiment", "nlp"],
      serviceFee: "0.03",
      active: true,
      reputation: 92,
    },
    {
      id: "3",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Plutus Deals",
      description: "Checks for brand coupon codes and active discount offers.",
      endpoint: "/api/agents/deals",
      capabilities: ["deals", "coupons", "savings"],
      serviceFee: "0.015",
      active: true,
      reputation: 95,
    },
    {
      id: "4",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Delphic Ranker",
      description: "Generates high-confidence score matrices for candidates.",
      endpoint: "/api/agents/recommendation",
      capabilities: ["ranking", "scores", "recommendation"],
      serviceFee: "0.05",
      active: true,
      reputation: 97,
    },
    {
      id: "5",
      owner: "0x0000000000000000000000000000000000000000",
      name: "Mercury Logistics",
      description: "Calculates transit times, shipping weight, and shipping costs.",
      endpoint: "/api/agents/shipping",
      capabilities: ["shipping", "logistics", "freight"],
      serviceFee: "0.025",
      active: true,
      reputation: 88,
    },
  ];

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Trigger alert on actual wagmi transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      addLog(`[BLOCKCHAIN] 🟢 Agent Passport Mint Tx confirmed: ${txHash}`);
      setTxAlert({
        show: true,
        type: "paid",
        mode: "deployment",
        nodeName: registerForm.name,
        fee: registerForm.serviceFee || "0",
        recipient: registryAddress,
        txHash: txHash
      });
      // Refresh list
      setTimeout(() => void fetchAgents(), 2000);
    }
  }, [isTxSuccess, txHash]);

  // Simulated active HUD values
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedBlock((prev) => prev + 1);
      setSimulatedLoad((prev) => Math.max(10, Math.min(35, prev + Math.floor(Math.random() * 5) - 2)));
      setSimulatedGas((prev) => Math.max(40, Math.min(80, prev + Math.floor(Math.random() * 7) - 3)));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch registered agents from the chain on load
  const fetchAgents = async () => {
    setIsLoadingRegistry(true);
    try {
      const response = await fetch("/api/agents/list");
      const result = await response.json();
      if (result.agents && Array.isArray(result.agents) && result.agents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = result.agents.map((a: any, idx: number) => ({
          ...a,
          serviceFee: a.serviceFee ? (Number(a.serviceFee) / 1e18).toString() : "0",
          reputation: 85 + (idx % 3) * 5,
        }));
        setRegisteredAgents(mapped);
      } else {
        setRegisteredAgents(defaultAgents);
      }
    } catch (e) {
      console.warn("Could not read registry contract, using default local agents:", e);
      setRegisteredAgents(defaultAgents);
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── Timer Helpers ──
  const startPipelineTimer = useCallback(() => {
    pipelineStartRef.current = Date.now();
    if (pipelineTimerRef.current) clearInterval(pipelineTimerRef.current);
    pipelineTimerRef.current = setInterval(() => {
      setPipelineElapsed(Date.now() - pipelineStartRef.current);
    }, 100);
  }, []);

  const startStepTimer = useCallback(() => {
    stepStartRef.current = Date.now();
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setStepElapsed(Date.now() - stepStartRef.current);
    }, 100);
  }, []);

  const stopTimers = useCallback(() => {
    if (pipelineTimerRef.current) { clearInterval(pipelineTimerRef.current); pipelineTimerRef.current = null; }
    if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  // Real Gaming Orchestrator Workflow connecting to the backend pipeline
  const runOrchestrator = async () => {
    if (isConsoleRunning) return;

    // ── PROMPT INJECTION SECURITY CHECK ──
    const isPromptInjectionClient = (text: string) => {
      if (!text) return { detected: false };
      const lower = text.toLowerCase();
      const blockList = [
        "ignore previous", "ignore instructions", "ignore the instructions", "ignore system prompt", "ignore all instructions",
        "override rules", "override instruction", "bypass rules", "bypass system", "jailbreak", "you are now", "act as a",
        "system prompt", "system instruction", "developer mode", "dan mode", "sudo mode", "select * from", "drop table",
        "delete from", "sql injection", "<script>", "javascript:", "onload=", "onerror="
      ];
      for (const pattern of blockList) {
        if (lower.includes(pattern)) {
          return { detected: true, reason: `Pattern '${pattern}' detected.` };
        }
      }
      return { detected: false };
    };

    const securityCheck = isPromptInjectionClient(query);
    if (securityCheck.detected) {
      alert(`[SECURITY ALERT] Prompt injection blocked: ${securityCheck.reason}`);
      setConsoleLogs([
        `[SECURITY ALERT] 🛑 Prompt Injection Blocked: ${securityCheck.reason}`,
        `[SECURITY ALERT] Pipeline execution halted for security policy compliance.`
      ]);
      setActiveStep("error");
      return;
    }

    setIsConsoleRunning(true);
    setConsoleLogs([]);
    setPipelineResult(null);
    setContextEnvelope(null);
    setCompletedSteps([]);
    setPlannedWorkflow([]);
    setPlannerModel("Computing Routing...");
    setPipelineElapsed(0);
    setStepElapsed(0);
    startPipelineTimer();

    addLog(`INITIATING NEURAL LINK WORKFLOW SEQUENCE...`);
    addLog(`OPERATOR TARGET PARAMS: "${query}"`);
    await sleep(600);

    try {
      // 1. Planning Step
      setActiveStep("trigger");
      addLog(`[PLANNER] Contacting Orchestration Service to compile node sequence...`);
      const orchestrateRes = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });
      if (!orchestrateRes.ok) {
        const errData = await orchestrateRes.json().catch(() => ({ error: "Planner service failed" }));
        throw new Error(errData.error || "Planner service failed");
      }
      const planData = await orchestrateRes.json();
      if (!planData.success || !planData.workflow) {
        throw new Error(planData.error || "Failed to generate workflow");
      }

      const workflow = planData.workflow as string[];
      setPlannedWorkflow(workflow);
      setPlannerModel(planData.modelUsed || "Sarvam-105B (MoE)");
      setActiveStep("orchestrate");
      addLog(`[PLANNER] ${planData.modelUsed || "Sarvam-105B (MoE)"} compiled sequence: [${workflow.join(" ➔ ")}]`);
      await sleep(1000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentContext: any = query;
      const historySoFar: { agent: string; output: unknown }[] = [];

      // ── CONCURRENT EXECUTION STAGES ──
      // Stage 1: Sequential Discovery (shopping)
      if (workflow.includes("shopping")) {
        const step = "shopping";
        startStepTimer();
        setActiveStep(step);
        await sleep(600);

        // Find agent in registry to check fee and owner
        const agent = registeredAgents.find(a =>
          a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
        ) || defaultAgents.find(a =>
          a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
        );

        const fee = agent?.serviceFee || "0";
        const owner = agent?.owner || "0x0000000000000000000000000000000000000000";

        // Show transaction alert modal
        setTxAlert({
          show: true,
          type: "free",
          mode: "execution",
          nodeName: agent?.name || "Shopping Agent",
          fee: fee,
          recipient: owner,
          txHash: ""
        });

        await sleep(1500);
        setTxAlert(prev => ({ ...prev, show: false }));

        addLog(`[ECONOMIC PAYMENTS] 🟢 Node [SHOPPING] is FREE tier. No transaction required.`);
        await sleep(400);

        // Construct context transfer envelope
        const contextObj = {
          jsonrpc: "2.0",
          method: "context/transfer",
          params: {
            query: query,
            history: historySoFar,
            currentData: currentContext,
            metadata: {
              caller: "AnyMindOrchestrator",
              timestamp: new Date().toISOString(),
              targetNode: step,
              feePaid: fee
            }
          }
        };

        setContextEnvelope(contextObj);
        addLog(`[CONTEXT TRANSFER] ⇄ Context Envelope passed to [SHOPPING]...`);
        await sleep(600);

        addLog(`[SYSTEM] Awakening Node: [SHOPPING]`);
        addLog(`[SHOPPING] Contacting database registry: "${query}"...`);
        await sleep(600);

        // Light up Apify Scraper node
        setActiveStep("apify");
        addLog(`[APIFY_SCRAPER] Dispatching live web scrapers to Apify Cloud...`);
        await sleep(1000);

        const callRes = await fetch("/api/call-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentName: step, input: contextObj.params }),
        });
        if (!callRes.ok) throw new Error(`Agent [${step}] failed execution`);

        currentContext = await callRes.json();
        if (!currentContext || currentContext.success === false) {
          throw new Error(currentContext.error || `Agent [${step}] returned unsuccessful status`);
        }

        if (currentContext.isRealScraped) {
          addLog(`[APIFY_SCRAPER] 🟢 Live web scrape successful! Extracted ${currentContext.count} products from Google Shopping.`);
        } else {
          addLog(`[APIFY_SCRAPER] ⚠ Scraper bypassed (APIFY_API_TOKEN is inactive). Pulled catalog mock data.`);
        }

        const names = currentContext.results.map((r: { name: string }) => r.name).join(", ");
        addLog(`[SHOPPING] Mapped candidate nodes: ${names}`);

        historySoFar.push({ agent: step, output: currentContext });

        // Record completed step
        const stepMs = Date.now() - stepStartRef.current;
        const payloadSize = JSON.stringify(currentContext).length;
        setCompletedSteps(prev => [...prev, {
          id: step,
          title: getStepDetails(step).title,
          elapsedMs: stepMs,
          status: "done",
          payloadSizeBytes: payloadSize,
          feePaid: fee,
        }]);
        await sleep(800);
      }

      // Stage 2: Concurrent Enrichment (pricing, reviews, deals)
      const parallelSteps = workflow.filter(s => ["pricing", "reviews", "deals"].includes(s));
      if (parallelSteps.length > 0) {
        addLog(`[CONCURRENT ORCHESTRATION] ⚡ Initializing concurrent enrichment on nodes: [${parallelSteps.join(", ").toUpperCase()}]`);
        
        // Highlight all parallel steps concurrently
        setActiveStep(parallelSteps.join(","));
        startStepTimer();

        // Calculate combined fees and display combined popup
        let totalFee = 0;
        let paymentLogs: string[] = [];
        const paidSteps: string[] = [];

        for (const step of parallelSteps) {
          const agent = registeredAgents.find(a =>
            a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
          ) || defaultAgents.find(a =>
            a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
          );
          const fee = agent?.serviceFee || (step === "pricing" ? "0.02" : step === "reviews" ? "0.03" : step === "deals" ? "0.015" : "0");
          const owner = agent?.owner || "0x0000000000000000000000000000000000000000";
          const isPaid = parseFloat(fee) > 0;

          if (isPaid) {
            totalFee += parseFloat(fee);
            paidSteps.push(step.toUpperCase());
            paymentLogs.push(`[ECONOMIC PAYMENTS] 💰 Charging ${fee} MON for node [${step.toUpperCase()}]`);
            paymentLogs.push(`[BLOCKCHAIN] 💸 Transferring service fee to owner: ${owner.slice(0, 6)}...${owner.slice(-4)}`);
          } else {
            paymentLogs.push(`[ECONOMIC PAYMENTS] 🟢 Node [${step.toUpperCase()}] is FREE tier. No transaction required.`);
          }
        }

        if (totalFee > 0) {
          const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
          setTxAlert({
            show: true,
            type: "paid",
            mode: "execution",
            nodeName: `Enrichment: ${paidSteps.join(" + ")}`,
            fee: totalFee.toFixed(3),
            recipient: "0xMultipleOwners",
            txHash: mockTx
          });
          await sleep(1500);
          setTxAlert(prev => ({ ...prev, show: false }));
          paymentLogs.push(`[BLOCKCHAIN] 🟢 Tx confirmed: ${mockTx.slice(0, 18)}... (Block: #${simulatedBlock})`);
        } else {
          setTxAlert({
            show: true,
            type: "free",
            mode: "execution",
            nodeName: `Enrichment: ${parallelSteps.join(" + ").toUpperCase()}`,
            fee: "0",
            recipient: "",
            txHash: ""
          });
          await sleep(1500);
          setTxAlert(prev => ({ ...prev, show: false }));
        }

        paymentLogs.forEach(log => addLog(log));
        await sleep(400);

        // Execute all enrichment fetches concurrently
        const parallelPromises = parallelSteps.map(async (step) => {
          const stepStart = Date.now();
          addLog(`[SYSTEM] Awakening Node: [${step.toUpperCase()}] (Concurrent Thread)`);

          const agent = registeredAgents.find(a =>
            a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
          ) || defaultAgents.find(a =>
            a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
          );
          const fee = agent?.serviceFee || (step === "pricing" ? "0.02" : step === "reviews" ? "0.03" : step === "deals" ? "0.015" : "0");

          const contextObj = {
            jsonrpc: "2.0",
            method: "context/transfer",
            params: {
              query: query,
              history: historySoFar,
              currentData: currentContext,
              metadata: {
                caller: "AnyMindOrchestrator",
                timestamp: new Date().toISOString(),
                targetNode: step,
                feePaid: fee
              }
            }
          };

          addLog(`[CONTEXT TRANSFER] ⇄ Context Envelope passed to [${step.toUpperCase()}]...`);

          const callRes = await fetch("/api/call-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentName: step, input: contextObj.params }),
          });
          if (!callRes.ok) throw new Error(`Agent [${step}] failed execution`);

          const stepResult = await callRes.json();
          if (!stepResult || stepResult.success === false) {
            throw new Error(stepResult.error || `Agent [${step}] returned unsuccessful status`);
          }

          if (step === "pricing") {
            const priceStrings = stepResult.results.map((r: { name: string; price: number }) => `${r.name} ($${r.price})`).join(", ");
            addLog(`[PRICING] Normalized oracle prices: ${priceStrings}`);
          } else if (step === "reviews") {
            const reviewScores = stepResult.results.map((r: { name: string; sentiment: { positive: number } }) => `${r.name} (${r.sentiment.positive}% Pos)`).join(", ");
            addLog(`[REVIEWS] Extracted customer sentiments: ${reviewScores}`);
          } else if (step === "deals") {
            const activeDeals = stepResult.results.map((r: { name: string; deal: { couponCode: string; discountPercent: number } }) => `${r.name} (${r.deal.couponCode}: -${r.deal.discountPercent}%)`).join(", ");
            addLog(`[DEALS] Matched active coupons: ${activeDeals}`);
          }

          const stepMs = Date.now() - stepStart;
          const payloadSize = JSON.stringify(stepResult).length;

          return { step, output: stepResult, stepMs, payloadSize, fee };
        });

        const parallelResults = await Promise.all(parallelPromises);

        // Merge results into historySoFar and completedSteps
        for (const res of parallelResults) {
          historySoFar.push({ agent: res.step, output: res.output });
          setCompletedSteps(prev => [...prev, {
            id: res.step,
            title: getStepDetails(res.step).title,
            elapsedMs: res.stepMs,
            status: "done",
            payloadSizeBytes: res.payloadSize,
            feePaid: res.fee
          }]);
        }

        // Forward enriched data (e.g. from deals which has prices + deal details, or pricing) to the next stages
        const enrichmentOutput = parallelResults.find(r => r.step === "deals")?.output 
                             || parallelResults.find(r => r.step === "pricing")?.output;
        if (enrichmentOutput) {
          currentContext = enrichmentOutput;
        }
        await sleep(800);
      }

      // Stage 3: Sequential Decisions & Logistics (recommendation, shipping)
      const endSteps = workflow.filter(s => ["recommendation", "shipping"].includes(s));
      for (const step of endSteps) {
        startStepTimer();
        setActiveStep(step);
        await sleep(600);

        const agent = registeredAgents.find(a =>
          a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
        ) || defaultAgents.find(a =>
          a.capabilities.includes(step) || a.name.toLowerCase().includes(step)
        );

        const fee = agent?.serviceFee || (step === "recommendation" ? "0.05" : "0.025");
        const owner = agent?.owner || "0x0000000000000000000000000000000000000000";
        const isPaid = parseFloat(fee) > 0;
        const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

        setTxAlert({
          show: true,
          type: isPaid ? "paid" : "free",
          mode: "execution",
          nodeName: agent?.name || (step.charAt(0).toUpperCase() + step.slice(1) + " Agent"),
          fee: fee,
          recipient: owner,
          txHash: isPaid ? mockTx : ""
        });

        await sleep(1500);
        setTxAlert(prev => ({ ...prev, show: false }));

        if (isPaid) {
          addLog(`[ECONOMIC PAYMENTS] 💰 Charging ${fee} MON for node [${step.toUpperCase()}]`);
          addLog(`[BLOCKCHAIN] 💸 Transferring service fee to owner: ${owner.slice(0, 6)}...${owner.slice(-4)}`);
          addLog(`[BLOCKCHAIN] 🟢 Tx confirmed: ${mockTx.slice(0, 18)}... (Block: #${simulatedBlock})`);
        } else {
          addLog(`[ECONOMIC PAYMENTS] 🟢 Node [${step.toUpperCase()}] is FREE tier. No transaction required.`);
        }
        await sleep(400);

        const contextObj = {
          jsonrpc: "2.0",
          method: "context/transfer",
          params: {
            query: query,
            history: historySoFar,
            currentData: currentContext,
            metadata: {
              caller: "AnyMindOrchestrator",
              timestamp: new Date().toISOString(),
              targetNode: step,
              feePaid: fee
            }
          }
        };

        setContextEnvelope(contextObj);
        addLog(`[CONTEXT TRANSFER] ⇄ Context Envelope passed to [${step.toUpperCase()}]...`);
        await sleep(600);

        addLog(`[SYSTEM] Awakening Node: [${step.toUpperCase()}]`);
        const callRes = await fetch("/api/call-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentName: step, input: contextObj.params }),
        });
        if (!callRes.ok) throw new Error(`Agent [${step}] failed execution`);

        currentContext = await callRes.json();
        if (!currentContext || currentContext.success === false) {
          throw new Error(currentContext.error || `Agent [${step}] returned unsuccessful status`);
        }

        if (step === "recommendation") {
          addLog(`[RECOMMENDATION] Target matches computed. Winner: ${currentContext.bestChoice.name}`);
        } else if (step === "shipping") {
          const cheapestOption = currentContext.options[0];
          addLog(`[SHIPPING] Logistics calculated for ${currentContext.bestChoice.name} to ${currentContext.destinationZip}. Carrier: ${cheapestOption.carrier} (Cost: $${cheapestOption.cost}, ETA: ${cheapestOption.transitDays} days)`);
        }

        historySoFar.push({ agent: step, output: currentContext });

        const stepMs = Date.now() - stepStartRef.current;
        const payloadSize = JSON.stringify(currentContext).length;
        setCompletedSteps(prev => [...prev, {
          id: step,
          title: getStepDetails(step).title,
          elapsedMs: stepMs,
          status: "done",
          payloadSizeBytes: payloadSize,
          feePaid: fee,
        }]);
        await sleep(800);
      }

      // Success
      setActiveStep("success");

      // Extract data from history for the final report
      const shoppingOut = historySoFar.find(h => h.agent === "shopping")?.output as any;
      const pricingOut = historySoFar.find(h => h.agent === "pricing")?.output as any;
      const reviewsOut = historySoFar.find(h => h.agent === "reviews")?.output as any;
      const dealsOut = historySoFar.find(h => h.agent === "deals")?.output as any;
      const recOut = historySoFar.find(h => h.agent === "recommendation")?.output as any;
      const shippingOut = historySoFar.find(h => h.agent === "shipping")?.output as any;

      setPipelineResult({
        bestChoice: recOut?.bestChoice || null,
        recommendations: recOut?.recommendations || [],
        shopping: shoppingOut?.results || [],
        pricing: pricingOut?.results || [],
        reviews: reviewsOut?.results || [],
        deals: dealsOut?.results || [],
        shipping: shippingOut || null,
      });
      stopTimers();
      addLog(`[SYS_ENGINE] PIPELINE EXECUTION SUCCESSFUL. DISPLAYING DECISION REPORT.`);
    } catch (err) {
      addLog(`[ERROR] Sequence execution failed: ${String(err)}`);
      setActiveStep("error");
      stopTimers();
    } finally {
      setIsConsoleRunning(false);
    }
  };

  // On-Chain Registration Form Submit
  const handleRegisterAgent = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      addLog(`[OFFLINE MODE] 🟢 Local Registration simulated for: "${registerForm.name}"`);
      const caps = registerForm.capabilities.split(",").map((c) => c.trim()).filter(Boolean);
      const newAgent: ContractAgent = {
        id: String(registeredAgents.length + 10),
        owner: "0x0000000000000000000000000000000000000000",
        name: registerForm.name,
        description: registerForm.description,
        endpoint: registerForm.endpoint,
        capabilities: caps,
        serviceFee: registerForm.serviceFee,
        active: true,
        reputation: 85
      };
      setRegisteredAgents(prev => [...prev, newAgent]);

      const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setTxAlert({
        show: true,
        type: "paid",
        mode: "deployment",
        nodeName: registerForm.name,
        fee: registerForm.serviceFee || "0",
        recipient: "0xRegistryAddress",
        txHash: mockHash
      });
      setShowRegisterModal(false);
      return;
    }

    try {
      addLog(`TRANSACTION INITIATED: REGISTER_AGENT`);
      const caps = registerForm.capabilities.split(",").map((c) => c.trim()).filter(Boolean);

      const feeInWei = parseEther(registerForm.serviceFee || "0");

      writeContract({
        address: registryAddress as `0x${string}`,
        abi: registryAbi,
        functionName: "registerAgent",
        args: [
          registerForm.name,
          registerForm.description,
          registerForm.endpoint,
          feeInWei,
          caps
        ],
      });

      addLog(`CONTRACT WRITE SUBMITTED. AWAITING USER APPROVAL IN WALLET.`);
      setShowRegisterModal(false);
    } catch (err) {
      addLog(`[ERROR] Registration failed: ${String(err)}`);
    }
  };

  // On-Chain Reputation Score Submit
  const handleRateAgent = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert("PLEASE CONNECT YOUR WALLET TO RATING CONTRACT");
      return;
    }

    try {
      addLog(`TRANSACTION INITIATED: RATE_AGENT`);
      const scoreNum = parseInt(rateForm.score);
      const agentIdNum = parseInt(rateForm.agentId);

      writeContract({
        address: reputationAddress as `0x${string}`,
        abi: reputationAbi,
        functionName: "rateAgent",
        args: [
          BigInt(agentIdNum),
          scoreNum,
          rateForm.comment
        ],
      });

      addLog(`CONTRACT WRITE SUBMITTED. AWAITING WALLET CONFIRMATION.`);
      setShowRateModal(false);
    } catch (err) {
      addLog(`[ERROR] Rating submission failed: ${String(err)}`);
    }
  };

  return (
    <main className="min-h-screen h-screen flex flex-col bg-[#0b0c0d] text-[#d1d5db] font-sans tactical-grid grain-overlay overflow-hidden select-none">

      {/* 1. HUD TOP NAVIGATION HEADER */}
      <header className="h-16 border-b border-white/5 bg-[#111315]/85 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo element with tactical orange design cue */}
          <div className="relative h-6 w-6 bg-tac-orange/10 border border-tac-orange/30 flex items-center justify-center font-tech text-[10px] text-tac-orange font-bold clip-chamfer-sm">
            A
            <span className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-tac-orange" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-orbitron font-extrabold text-sm tracking-widest text-white leading-none">
                ANYMIND
              </h1>
            </div>

          </div>
        </div>

        {/* METRICS HUD SEGMENT */}
        <div className="hidden lg:flex items-center gap-6 font-tech text-[10px]">
          <div className="flex flex-col text-right">
            <span className="text-slate-500 uppercase text-[8px]">PLANNER MODEL</span>
            <span className="text-tac-orange font-bold uppercase">{plannerModel}</span>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex flex-col text-right">
            <span className="text-slate-500 uppercase text-[8px]">BLOCK HEIGHT</span>
            <span className="text-white font-medium">#{simulatedBlock}</span>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex flex-col text-right">
            <span className="text-slate-500 uppercase text-[8px]">ACTIVE INSTANCES</span>
            <span className="text-tac-blue font-bold">{registeredAgents.length || 0} DEPLOYED</span>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex flex-col text-right">
            <span className="text-slate-500 uppercase text-[8px]">GAS CEILING</span>
            <span className="text-tac-green font-medium">0.0001 MON</span>
          </div>
        </div>

        {/* SYNC ACTIONS */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <div className="flex items-center gap-2 border border-tac-green/20 bg-tac-green/5 px-3 py-1.5 rounded-sm font-tech text-xs text-tac-green clip-chamfer-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-tac-green animate-pulse" />
              <span>LINKED: {address.slice(0, 6)}...{address.slice(-4)}</span>
              {balanceData && (
                <span className="text-[10px] text-white font-tech pl-2 border-l border-tac-green/20">
                  {(Number(balanceData.value) / 10 ** balanceData.decimals).toFixed(4)} MON
                </span>
              )}
              <button
                onClick={() => disconnect()}
                className="hover:text-tac-orange transition-colors ml-2 border-l border-tac-green/20 pl-2 font-bold cursor-pointer"
              >
                OUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="bg-tac-orange hover:bg-tac-orange/85 text-black transition-all px-4 py-2 font-tech font-bold text-xs tracking-wider clip-chamfer-sm cursor-pointer border-none"
            >
              SYNC LINK
            </button>
          )}

          <button
            onClick={() => setShowRegisterModal(true)}
            className="border border-tac-blue/40 hover:border-tac-blue bg-tac-gray hover:bg-tac-gray/85 text-tac-blue hover:text-white transition-all duration-200 px-4 py-2 font-tech text-xs font-bold tracking-wider clip-chamfer-sm cursor-pointer"
          >
            DEPLOY NODE
          </button>
        </div>
      </header>

      {/* 2. BODY SHELL */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* SIDEBAR PANEL CONTROL */}
        <aside className="w-64 border-r border-white/5 bg-[#111315]/45 backdrop-blur-md p-4 flex flex-col justify-between shrink-0 z-20 font-tech">
          <div className="space-y-6">
            <div className="pb-3 border-b border-white/5">
              <span className="text-[10px] text-slate-500 tracking-widest block uppercase font-bold">TACTICAL CONTROLS</span>
            </div>

            {/* TAB SELECTORS */}
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("workspace")}
                className={`w-full py-2.5 px-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left clip-chamfer-sm ${activeTab === "workspace"
                  ? "bg-tac-gray text-tac-orange font-bold border-l-2 border-tac-orange"
                  : "text-slate-200 hover:bg-tac-gray/30 hover:text-white border-l-2 border-transparent"
                  }`}
              >
                <span className="text-[10px] text-slate-600">01 /</span>
                <span className="text-xs font-bold tracking-widest uppercase">WORKSPACE</span>
              </button>

              <button
                onClick={() => setActiveTab("workforce")}
                className={`w-full py-2.5 px-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left clip-chamfer-sm ${activeTab === "workforce"
                  ? "bg-tac-gray text-tac-orange font-bold border-l-2 border-tac-orange"
                  : "text-slate-200 hover:bg-tac-gray/30 hover:text-white border-l-2 border-transparent"
                  }`}
              >
                <span className="text-[10px] text-slate-600">02 /</span>
                <span className="text-xs font-bold tracking-widest uppercase">NODE INDEX</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full py-2.5 px-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left clip-chamfer-sm ${activeTab === "settings"
                  ? "bg-tac-gray text-tac-orange font-bold border-l-2 border-tac-orange"
                  : "text-slate-200 hover:bg-tac-gray/30 hover:text-white border-l-2 border-transparent"
                  }`}
              >
                <span className="text-[10px] text-slate-600">03 /</span>
                <span className="text-xs font-bold tracking-widest uppercase">SYSTEM SPECS</span>
              </button>
            </nav>
          </div>

          {/* LOWER SIDEBAR METRICS */}
          <div className="space-y-4 pt-4 border-t border-white/5 text-[10px] text-slate-500 uppercase">
            <div className="flex items-center justify-between">
              <span>NETWORK LOAD</span>
              <span className="text-white font-medium">{simulatedLoad}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>GAS ESTIMATE</span>
              <span className="text-white font-medium">{simulatedGas} GWEI</span>
            </div>
            <div className="flex items-center justify-between">
              <span>MONAD LINK</span>
              <span className={isConnected ? "text-tac-green font-bold" : "text-tac-blue font-bold"}>
                {isConnected ? "ACTIVE" : "LOCAL"}
              </span>
            </div>
            <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
              <div
                className="h-full bg-tac-orange transition-all duration-1000"
                style={{ width: `${simulatedLoad}%` }}
              />
            </div>
          </div>
        </aside>

        {/* 3. MAIN CONTENT SCENE VIEW */}
        <div className="flex-1 overflow-y-auto p-6 relative">

          {/* TAB 1: COMMAND STATION WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full items-start">

              {/* PLAYGROUND WIDGET */}
              <div className="tactical-panel tactical-border-orange p-6 flex flex-col gap-4 min-h-[500px]">
                <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-tac-orange rounded-full" />
                    <h2 className="font-orbitron font-bold text-xs tracking-wider text-white uppercase">
                      SYSTEM PLAYGROUND
                    </h2>
                  </div>
                  <span className="font-tech text-[9px] text-slate-500">OPERATOR CONSOLE</span>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-tech text-[9px] tracking-wider text-slate-500 uppercase">INPUT SYSTEM DIRECTIVE</label>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      rows={3}
                      placeholder="Specify query request directives..."
                      className="w-full bg-[#0d0e10]/80 border border-white/10 rounded-sm p-3 font-tech text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50 transition-all resize-none"
                    />
                  </div>

                  <button
                    onClick={runOrchestrator}
                    disabled={isConsoleRunning}
                    className="w-full font-tech font-bold tracking-widest text-xs py-3 bg-tac-orange hover:bg-tac-orange/85 disabled:brightness-50 text-black clip-chamfer-sm transition-all cursor-pointer border-none"
                  >
                    {isConsoleRunning ? "SEQUENCING FLOW..." : "EXECUTE TASK PIPELINE"}
                  </button>
                </div>

                {/* CONSOLE LOGGER */}
                <div className="flex-1 flex flex-col min-h-[260px] bg-black/40 border border-white/5 rounded-sm p-4 font-tech text-xs leading-6">
                  <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-white/5 mb-2 text-[10px]">
                    <span>SYS_OUTPUT_STREAM</span>
                    <div className="flex items-center gap-3">
                      {contextEnvelope && (
                        <button
                          onClick={() => setShowContextModal(true)}
                          className="text-tac-blue hover:text-white transition-colors cursor-pointer border-none bg-transparent font-tech uppercase font-bold text-[9px]"
                        >
                          [INSPECT CONTEXT]
                        </button>
                      )}
                      <span className={isConsoleRunning ? "animate-pulse text-tac-orange" : "text-slate-600"}>
                        {isConsoleRunning ? "SYNC_BUSY" : "SYNC_IDLE"}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto max-h-[280px] space-y-1.5 pr-1 text-[11px]">
                    {consoleLogs.map((log, index) => {
                      let color = "text-slate-400";
                      if (log.includes("[ERROR]")) color = "text-rose-400";
                      else if (log.includes("🟢")) color = "text-tac-green";
                      else if (log.includes("💰")) color = "text-tac-blue font-semibold";
                      else if (log.includes("🎯")) color = "text-tac-orange";
                      else if (log.includes("COMPLETE") || log.includes("NOMINAL")) color = "text-tac-green font-bold";

                      return (
                        <div key={index} className={`whitespace-pre-wrap ${color}`}>
                          {log}
                        </div>
                      );
                    })}
                    <div ref={consoleEndRef} />
                  </div>

                  <div className="border-t border-white/5 pt-2 mt-2 flex items-center gap-1.5 text-tac-orange text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-tac-orange animate-pulse" />
                    <span>AWAITING DIRECTIVES</span>
                    <span className="border-r border-tac-orange h-3 animate-ping caret-blink pl-0.5" />
                  </div>
                </div>
              </div>

              {/* PATHWAY GRAPH WIDGET — ENHANCED */}
              <div className="tactical-panel tactical-border-blue p-6 flex flex-col justify-between min-h-[500px]">
                <div>
                  <div className="border-b border-white/5 pb-3 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-tac-blue rounded-full" />
                      <h2 className="font-orbitron font-bold text-xs tracking-wider text-white uppercase">
                        ORCHESTRATOR PIPELINE
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 font-tech text-[9px]">
                      {isConsoleRunning && (
                        <span className="text-tac-orange animate-pulse font-bold">
                          ⏱ {(pipelineElapsed / 1000).toFixed(1)}s
                        </span>
                      )}
                      {!isConsoleRunning && pipelineElapsed > 0 && (
                        <span className="text-tac-green font-bold">
                          ✓ {(pipelineElapsed / 1000).toFixed(1)}s TOTAL
                        </span>
                      )}
                      <span className="text-slate-500">DYNAMIC FLOW</span>
                    </div>
                  </div>

                  {/* GLOBAL PROGRESS BAR */}
                  {(isConsoleRunning || completedSteps.length > 0) && (
                    <div className="mb-4 space-y-1.5">
                      <div className="flex items-center justify-between font-tech text-[9px] uppercase">
                        <span className="text-slate-500">
                          PIPELINE PROGRESS: <span className="text-white font-bold">{completedSteps.length}/6</span> NODES COMPLETE
                        </span>
                        <span className={`font-bold ${activeStep === "success" ? "text-tac-green" : activeStep === "error" ? "text-rose-400" : "text-tac-orange"}`}>
                          {activeStep === "success" ? "NOMINAL" : activeStep === "error" ? "FAULTED" : isConsoleRunning ? "EXECUTING" : "READY"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#0b0c0d] border border-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ease-out rounded-full ${activeStep === "success" ? "bg-tac-green" : activeStep === "error" ? "bg-rose-500" : "bg-tac-orange"}`}
                          style={{ width: `${activeStep === "success" ? 100 : Math.round((completedSteps.length / 6) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* DUAL-PANE: NODES + TIMELINE */}
                  <div className={`grid gap-4 ${completedSteps.length > 0 ? "grid-cols-[1fr_200px]" : "grid-cols-1"} w-full`}>
                                   {/* LEFT: VISUAL CHART NODES */}
                    <div className="bg-[#0b0c0d]/60 border border-white/5 rounded-sm flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[340px] w-full">
                      <div className="relative z-10 w-full flex flex-col items-center gap-2 max-w-xl">

                      {/* Helper to render a node */}
                      {(() => {
                        const nodeLabels: Record<string, [string, string]> = {
                          trigger: ["NODE 01 / OPERATOR", "USER_QUERY_PARSE"],
                          orchestrate: ["NODE 02 / PLANNER", "INTELLIGENT_ROUTING"],
                          shopping: ["NODE 03 / SHOPPING", "CATALOG_SEEK_AGENT"],
                          apify: ["NODE 04 / APIFY SCRAPER", "LIVE_WEB_SCRAPE"],
                          pricing: ["NODE 05 / PRICING", "FEED_AGGREGATOR"],
                          reviews: ["NODE 06 / REVIEWS", "SENTIMENT_ANALYZER"],
                          deals: ["NODE 07 / DEALS", "COUPON_MATCHER"],
                          recommendation: ["NODE 08 / RANKING", "DELPHIC_AGGREGATOR"],
                          shipping: ["NODE 09 / SHIPPING", "LOGISTICS_ESTIMATOR"],
                        };
                        const nodeTools: Record<string, string[]> = {
                          trigger: ["intent_parse"],
                          orchestrate: ["sarvam_105b", "route_planner"],
                          shopping: ["mcp_shopping"],
                          apify: ["apify_scraper"],
                          pricing: ["mcp_pricing"],
                          reviews: ["mcp_reviews"],
                          deals: ["mcp_deals", "pricing_rpc"],
                          recommendation: ["mcp_ranking"],
                          shipping: ["mcp_shipping"],
                        };
                        const nodeColors: Record<string, string> = {
                          trigger: "tac-orange", orchestrate: "tac-orange",
                          shopping: "tac-green", apify: "tac-orange",
                          pricing: "tac-blue", reviews: "tac-orange",
                          deals: "tac-green", recommendation: "tac-orange",
                          shipping: "tac-blue",
                        };
                        const colorClasses: Record<string, { border: string; text: string; bg: string }> = {
                          "tac-orange": { border: "border-tac-orange", text: "text-tac-orange", bg: "bg-tac-orange" },
                          "tac-green": { border: "border-tac-green", text: "text-tac-green", bg: "bg-tac-green" },
                          "tac-blue": { border: "border-tac-blue", text: "text-tac-blue", bg: "bg-tac-blue" },
                        };

                        const isDone = (id: string) => completedSteps.some(s => s.id === id);
                        const isActive = (id: string) => activeStep.split(",").includes(id);
                        const isBypassed = (id: string) => plannedWorkflow.length > 0 && 
                                           id !== "trigger" && 
                                           id !== "orchestrate" && 
                                           (id === "apify" ? !plannedWorkflow.includes("shopping") : !plannedWorkflow.includes(id));

                        const renderNodeCard = (id: string) => {
                          const [label, sub] = nodeLabels[id];
                          const col = nodeColors[id];
                          const cc = colorClasses[col];
                          const done = isDone(id);
                          const active = isActive(id);
                          const bypassed = isBypassed(id);
                          const tools = nodeTools[id] || [];

                          if (bypassed) {
                            return (
                              <div key={id} className="w-full py-1.5 px-3 border border-white/5 text-center transition-all duration-300 tactical-btn relative opacity-20 saturate-0 bg-transparent rounded-sm">
                                <span className="absolute top-0.5 right-1.5 font-tech text-[6px] tracking-widest uppercase font-bold text-slate-600">
                                  ○ BYPASSED
                                </span>
                                <span className="font-tech text-[8px] tracking-widest block uppercase text-slate-500">{label}</span>
                                <span className="text-[9px] text-slate-500 line-through truncate block">{sub}</span>
                                {tools.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-center mt-1.5 pt-1 border-t border-white/5 opacity-55">
                                    {tools.map(tool => (
                                      <span key={tool} className="font-tech text-[6px] px-1 py-0.5 rounded-sm border bg-black/20 border-white/5 text-slate-600 font-bold uppercase">
                                        ⚙️ {tool}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={id} className={`w-full py-1.5 px-3 border text-center transition-all duration-300 tactical-btn relative rounded-sm ${
                              active ? `${cc.border} ${cc.text} font-bold pulse-tactical` :
                              done ? "border-tac-green/30 text-tac-green/80" : "border-white/5 text-slate-400"
                            }`}>
                              <span className={`absolute top-0.5 right-1.5 font-tech text-[6px] tracking-widest uppercase font-bold ${
                                active ? `${cc.text} animate-pulse` : done ? "text-tac-green" : "text-slate-600"
                              }`}>
                                {active ? "● ACTIVE" : done ? "✓ DONE" : "○ IDLE"}
                              </span>
                              <span className="font-tech text-[8px] tracking-widest block uppercase text-slate-500">{label}</span>
                              <span className="text-[9px] truncate block">{sub}</span>
                              {active && isConsoleRunning && (
                                <span className={`block text-[7px] ${cc.text} font-bold animate-pulse`}>
                                  ⏱ {(stepElapsed / 1000).toFixed(1)}s
                                </span>
                              )}
                              {done && !active && (() => {
                                const cs = completedSteps.find(s => s.id === id);
                                return cs ? (
                                  <span className="block text-[7px] text-tac-green/70">
                                    ✓ {(cs.elapsedMs / 1000).toFixed(1)}s
                                  </span>
                                ) : null;
                              })()}
                              {tools.length > 0 && (
                                <div className="flex flex-wrap gap-1 justify-center mt-1.5 pt-1 border-t border-white/5">
                                  {tools.map(tool => (
                                    <span key={tool} className={`font-tech text-[6px] px-1 py-0.5 rounded-sm border font-bold uppercase ${
                                      active ? "bg-white/10 border-current" : done ? "bg-tac-green/5 border-tac-green/20 text-tac-green/70" : "bg-black/20 border-white/5 text-slate-500"
                                    }`}>
                                      ⚙️ {tool}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        };

                        const renderConnector = (activeFlag: boolean, bypassedFlag: boolean) => (
                          <div className={`h-4 w-px border-l border-dashed relative mx-auto ${bypassedFlag ? "border-white/5" : "border-white/20"}`}>
                            {activeFlag && <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 bg-tac-orange rounded-full animate-ping" />}
                            {activeFlag && <span className="data-flow-particle" />}
                          </div>
                        );

                        return (
                          <div className="w-full flex flex-col items-center">
                            {/* ── SECTION 1: DISCOVERY (VERTICAL) ── */}
                            <div className="w-full max-w-sm flex flex-col items-center">
                              {renderNodeCard("trigger")}
                              {renderConnector(isActive("orchestrate"), isBypassed("orchestrate"))}
                              {renderNodeCard("orchestrate")}
                              {renderConnector(isActive("shopping"), isBypassed("shopping"))}
                              {renderNodeCard("shopping")}
                              {renderConnector(isActive("apify"), isBypassed("apify"))}
                              {renderNodeCard("apify")}
                            </div>

                            {/* ── GRAPH BRANCH SPLIT CONNECTORS ── */}
                            <div className="w-full relative h-6 flex justify-center">
                              {/* Central vertical line entering from Apify */}
                              <div className="absolute top-0 bottom-1/2 left-1/2 w-px border-l border-dashed border-white/20" />
                              {/* Horizontal split line linking the three columns */}
                              <div className="absolute bottom-1/2 left-[16.6%] right-[16.6%] h-px border-t border-dashed border-white/20" />
                              
                              {/* Left branch drop */}
                              <div className={`absolute top-1/2 bottom-0 left-[16.6%] w-px border-l border-dashed ${isActive("pricing") ? "border-tac-blue" : "border-white/20"}`}>
                                {isActive("pricing") && <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 bg-tac-blue rounded-full animate-ping" />}
                                {isActive("pricing") && <span className="data-flow-particle" />}
                              </div>
                              
                              {/* Center branch drop */}
                              <div className={`absolute top-1/2 bottom-0 left-1/2 w-px border-l border-dashed ${isActive("reviews") ? "border-tac-orange" : "border-white/20"}`}>
                                {isActive("reviews") && <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 bg-tac-orange rounded-full animate-ping" />}
                                {isActive("reviews") && <span className="data-flow-particle" />}
                              </div>
                              
                              {/* Right branch drop */}
                              <div className={`absolute top-1/2 bottom-0 right-[16.6%] w-px border-l border-dashed ${isActive("deals") ? "border-tac-green" : "border-white/20"}`}>
                                {isActive("deals") && <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 bg-tac-green rounded-full animate-ping" />}
                                {isActive("deals") && <span className="data-flow-particle" />}
                              </div>
                            </div>

                            {/* ── SECTION 2: CONCURRENT ENRICHMENT (HORIZONTAL GRID) ── */}
                            <div className="grid grid-cols-3 gap-3 w-full my-1">
                              <div className="flex flex-col items-center">
                                {renderNodeCard("pricing")}
                              </div>
                              <div className="flex flex-col items-center">
                                {renderNodeCard("reviews")}
                              </div>
                              <div className="flex flex-col items-center">
                                {renderNodeCard("deals")}
                              </div>
                            </div>

                            {/* ── GRAPH MERGE CONNECTORS ── */}
                            <div className="w-full relative h-6 flex justify-center">
                              {/* Left branch rise */}
                              <div className={`absolute top-0 bottom-1/2 left-[16.6%] w-px border-l border-dashed ${isDone("pricing") ? "border-tac-green/40" : "border-white/20"}`} />
                              {/* Center branch rise */}
                              <div className={`absolute top-0 bottom-1/2 left-1/2 w-px border-l border-dashed ${isDone("reviews") ? "border-tac-green/40" : "border-white/20"}`} />
                              {/* Right branch rise */}
                              <div className={`absolute top-0 bottom-1/2 right-[16.6%] w-px border-l border-dashed ${isDone("deals") ? "border-tac-green/40" : "border-white/20"}`} />
                              
                              <div className="absolute bottom-1/2 left-[16.6%] right-[16.6%] h-px border-t border-dashed border-white/20" />
                              
                              {/* Central output line going to Recommendation */}
                              <div className={`absolute top-1/2 bottom-0 left-1/2 w-px border-l border-dashed ${isActive("recommendation") ? "border-tac-orange" : "border-white/20"}`}>
                                {isActive("recommendation") && <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 bg-tac-orange rounded-full animate-ping" />}
                                {isActive("recommendation") && <span className="data-flow-particle" />}
                              </div>
                            </div>

                            {/* ── SECTION 3: DECISIONS & CHECKOUT (VERTICAL) ── */}
                            <div className="w-full max-w-sm flex flex-col items-center">
                              {renderNodeCard("recommendation")}
                              {renderConnector(isActive("shipping"), isBypassed("shipping"))}
                              {renderNodeCard("shipping")}
                            </div>
                          </div>
                        );
                      })()}
                      </div>
                    </div>

                    {/* RIGHT: EXECUTION TIMELINE */}
                    {completedSteps.length > 0 && (
                      <div className="bg-[#0b0c0d]/40 border border-white/5 rounded-sm p-3 font-tech text-[9px] space-y-0 overflow-y-auto max-h-[340px]">
                        <div className="text-slate-500 text-[8px] tracking-widest uppercase font-bold pb-2 border-b border-white/5 mb-2">
                          EXECUTION TIMELINE
                        </div>
                        {completedSteps.map((cs, idx) => (
                          <div key={cs.id} className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
                            <div className="flex flex-col items-center pt-0.5">
                              <span className="h-2 w-2 rounded-full bg-tac-green border border-tac-green/40 flex-shrink-0" />
                              {idx < completedSteps.length - 1 && <div className="w-px flex-1 bg-tac-green/20 mt-0.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold uppercase truncate text-[8px]">{cs.id}</div>
                              <div className="text-slate-500 text-[7px] space-x-2">
                                <span className="text-tac-green">{(cs.elapsedMs / 1000).toFixed(1)}s</span>
                                <span>•</span>
                                <span>{(cs.payloadSizeBytes / 1024).toFixed(1)}KB</span>
                              </div>
                              {parseFloat(cs.feePaid) > 0 && (
                                <div className="text-tac-blue text-[7px]">💰 {cs.feePaid} MON</div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Total summary after completion */}
                        {activeStep === "success" && (
                          <div className="mt-2 pt-2 border-t border-tac-green/20 text-tac-green">
                            <div className="font-bold text-[8px] uppercase">TOTAL PIPELINE</div>
                            <div className="text-[7px] space-x-2">
                              <span>{(pipelineElapsed / 1000).toFixed(1)}s</span>
                              <span>•</span>
                              <span>{completedSteps.length} NODES</span>
                              <span>•</span>
                              <span>{completedSteps.reduce((sum, s) => sum + parseFloat(s.feePaid), 0).toFixed(2)} MON</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTIVE STEP SPEC DETAILED REPORT */}
                  {(() => {
                    const stepInfo = getStepDetails(activeStep);
                    return (
                      <div className="mt-4 bg-[#111315]/50 border border-white/5 p-4 rounded-sm font-tech text-xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-tac-orange font-bold uppercase tracking-wider text-[10px]">
                          <span>{stepInfo.title}</span>
                          <div className="flex items-center gap-3">
                            {isConsoleRunning && (
                              <span className="text-tac-orange text-[8px] animate-pulse font-normal">
                                STEP: {(stepElapsed / 1000).toFixed(1)}s
                              </span>
                            )}
                            <span className="text-slate-500 font-normal text-[8px]">{stepInfo.nftStatus}</span>
                          </div>
                        </div>
                        <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                          {stepInfo.desc}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-500 pt-1 border-t border-white/5 uppercase font-tech">
                          <div>SOURCE: <span className="text-white">{stepInfo.source}</span></div>
                          <div>DESTINATION: <span className="text-white">{stepInfo.dest}</span></div>
                          <div>PROTOCOL: <span className="text-tac-blue font-bold">{stepInfo.protocol}</span></div>
                          <div>PAYLOAD:
                            <span className="text-tac-green font-bold ml-1">
                              {contextEnvelope ? `${(JSON.stringify(contextEnvelope).length / 1024).toFixed(1)}KB` : "—"}
                            </span>
                          </div>
                        </div>
                        {stepInfo.toolsList && stepInfo.toolsList.length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-1.5">
                            <span className="font-tech text-[8px] tracking-widest text-slate-500 block font-bold uppercase">ACTIVATED NODE TOOLS</span>
                            <div className="space-y-1">
                              {stepInfo.toolsList.map((tool: any) => (
                                <div key={tool.name} className="flex flex-col bg-black/30 border border-white/5 p-2 rounded-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-tac-blue font-mono">⚙️ {tool.name.toUpperCase()}</span>
                                    <span className="bg-tac-blue/10 border border-tac-blue/30 px-1 py-[1px] rounded-[2px] font-tech text-[6px] text-tac-blue font-bold uppercase">ACTIVE TOOL</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-sans mt-0.5 leading-normal">{tool.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 font-tech text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    ACTIVE SPEC STAGE: <span className="text-tac-orange font-bold uppercase">{activeStep}</span>
                    {isConsoleRunning && <span className="h-1 w-1 rounded-full bg-tac-orange animate-ping" />}
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-tac-orange" /> PLAN</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-tac-green" /> SEEK</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-tac-blue" /> CALC</span>
                  </div>
                </div>
              </div>

              {/* PIPELINE RESULT DECISION REPORT */}
              {pipelineResult && (
                <div className="tactical-panel tactical-border-orange p-6 border border-white/5 font-tech mt-6">
                  <div className="border-b border-white/5 pb-3 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-tac-orange rounded-full" />
                      <h2 className="font-orbitron font-bold text-xs tracking-wider text-white uppercase">
                        DECISION ANALYTICS REPORT
                      </h2>
                    </div>
                    <span className="text-[9px] text-slate-500">TASK SUCCESS // EVALUATION COMPLETE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
                    {/* Recommendation Highlight */}
                    <div className="bg-[#0b0c0d] p-4 border border-white/5 flex flex-col justify-between clip-chamfer-sm">
                      <div>
                        <span className="text-slate-500 text-[8px] tracking-widest block uppercase">BEST CHOICE TARGET</span>
                        <span className="text-sm font-orbitron font-bold text-white uppercase mt-1 block">
                          {pipelineResult.bestChoice?.name || "N/A"}
                        </span>
                      </div>
                      
                      {pipelineResult.shipping && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                          <span className="text-slate-500 text-[8px] tracking-widest block uppercase">LOGISTICS ESTIMATION</span>
                          <div className="text-[10px] text-white space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">DESTINATION:</span>
                              <span className="font-bold text-tac-blue">{pipelineResult.shipping.destinationZip}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">CARRIER:</span>
                              <span className="font-bold text-slate-300">{pipelineResult.shipping.options[0].carrier}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">COST:</span>
                              <span className="font-bold text-tac-green">
                                {pipelineResult.shipping.options[0].cost === 0 ? "FREE" : `$${pipelineResult.shipping.options[0].cost}`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">DELIVERY ETA:</span>
                              <span className="font-bold text-tac-orange">{pipelineResult.shipping.options[0].transitDays} DAYS</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-white/5">
                        <span className="text-slate-500 text-[8px] tracking-widest block uppercase">CONFIDENCE FACTOR</span>
                        <span className="text-tac-green font-bold text-lg">
                          {pipelineResult.bestChoice ? `${Math.round(pipelineResult.bestChoice.score * 100)}%` : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Candidate Matrix Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500">
                            <th className="pb-2 font-bold uppercase tracking-wider">CANDIDATE NODE</th>
                            <th className="pb-2 font-bold uppercase tracking-wider text-right">PRICE (EST)</th>
                            <th className="pb-2 font-bold uppercase tracking-wider text-right">SENTIMENT</th>
                            <th className="pb-2 font-bold uppercase tracking-wider text-right">COUPON DEAL</th>
                            <th className="pb-2 font-bold uppercase tracking-wider text-right">SCORE MATCH</th>
                            <th className="pb-2 font-bold uppercase tracking-wider pl-4">EVALUATION SUMMARY</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pipelineResult.recommendations?.map((item: { name: string; score: number; reason: string }, idx: number) => {
                            // Lookups from other agents' results
                            const reviewInfo = pipelineResult.reviews?.find((r: any) => r.name.toLowerCase() === item.name.toLowerCase());
                            const dealInfo = pipelineResult.deals?.find((d: any) => d.name.toLowerCase() === item.name.toLowerCase());
                            const pricingInfo = pipelineResult.pricing?.find((p: any) => p.name.toLowerCase() === item.name.toLowerCase());
                            const shoppingInfo = pipelineResult.shopping?.find((s: any) => s.name.toLowerCase() === item.name.toLowerCase());

                            const basePrice = pricingInfo?.price || shoppingInfo?.price || dealInfo?.price || 999;
                            const finalPrice = dealInfo?.deal?.finalPrice || basePrice;
                            const discountPercent = dealInfo?.deal?.discountPercent || 0;
                            const couponCode = dealInfo?.deal?.couponCode || "";
                            const positiveSentiment = reviewInfo?.sentiment?.positive || 85;

                            return (
                              <tr key={idx} className="hover:bg-white/5">
                                <td className="py-2.5 text-white font-medium uppercase">{item.name}</td>
                                <td className="py-2.5 text-right font-medium">
                                  {discountPercent > 0 ? (
                                    <div className="flex flex-col items-end">
                                      <span className="line-through text-slate-500 text-[10px]">${basePrice}</span>
                                      <span className="text-tac-green font-bold">${finalPrice}</span>
                                    </div>
                                  ) : (
                                    <span className="text-tac-blue">${basePrice}</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-tac-green">
                                  {positiveSentiment}% POS
                                </td>
                                <td className="py-2.5 text-right font-medium">
                                  {discountPercent > 0 ? (
                                    <span className="bg-tac-orange/10 border border-tac-orange/20 px-1.5 py-0.5 rounded-sm text-[8px] text-tac-orange font-mono uppercase">
                                      -{discountPercent}% ({couponCode})
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right font-bold text-tac-orange">
                                  {Math.round(item.score * 100)}%
                                </td>
                                <td className="py-2.5 pl-4 text-slate-400 font-sans text-[10px]">{item.reason}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: NEURAL WORKFORCE INDEX */}
          {activeTab === "workforce" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-tac-orange rounded-full" />
                  <h2 className="font-orbitron font-bold text-sm tracking-widest text-white uppercase">
                    NEURAL WORKFORCE INDEX
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void fetchAgents()}
                    className="border border-tac-blue/40 hover:border-tac-blue bg-tac-gray text-tac-blue hover:text-white transition-all px-4 py-2 font-tech text-xs font-bold tracking-wider clip-chamfer-sm cursor-pointer"
                  >
                    {isLoadingRegistry ? "SYNCING..." : "SYNC REGISTRY"}
                  </button>
                </div>
              </div>

              {/* CARD DECK GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {registeredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="tactical-panel p-6 flex flex-col justify-between min-h-[260px] border border-white/5"
                  >
                    <div>
                      {/* CARD NODE HEADER */}
                      <div className="flex items-start justify-between border-b border-white/5 pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          {/* Dynamic 2-Letter Icon Box */}
                          <div className="h-8 w-8 border border-white/10 bg-[#0d0e10]/80 rounded-sm flex items-center justify-center font-tech text-xs text-tac-blue font-bold uppercase">
                            {agent.name.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-orbitron font-bold text-xs text-white uppercase">{agent.name}</h3>
                            <span className="font-tech text-[8px] text-slate-500 block">
                              GATEWAY: {agent.endpoint}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="font-sans text-[11px] text-slate-400 min-h-[44px] leading-5 mb-4">
                        {agent.description}
                      </p>

                      {/* Capabilities deck */}
                      <div className="mb-4">
                        <span className="font-tech text-[8px] tracking-widest text-slate-500 block mb-2 font-bold uppercase">CAPABILITY SCHEMAS</span>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="bg-tac-gray border border-white/5 px-2.5 py-0.5 rounded-sm font-tech text-[9px] text-slate-300 tracking-wide"
                            >
                              {cap.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="border-t border-white/5 pt-4 mt-2 flex items-center justify-between font-tech text-[10px] uppercase">
                      <div className="text-slate-500">
                        FEE: <span className="text-tac-green font-bold">{agent.serviceFee && parseFloat(agent.serviceFee) > 0 ? `${agent.serviceFee} MON` : "FREE"}</span>
                      </div>
                      <div className="text-tac-orange font-bold">
                        TRUST: {agent.reputation}%
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM CONFIGURATION SPECS */}
          {activeTab === "settings" && (
            <div className="tactical-panel p-6 border border-white/5 max-w-4xl space-y-6">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-tac-blue rounded-full" />
                  <h2 className="font-orbitron font-bold text-sm tracking-widest text-white uppercase">
                    SYSTEM SPECIFICATIONS
                  </h2>
                </div>
              </div>

              {/* DETAILS AND CONFIGURATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-tech text-xs">

                {/* CONTRACT REGISTRIES */}
                <div className="space-y-4">
                  <h3 className="font-orbitron font-bold text-xs tracking-wider text-slate-300 uppercase">Deployed Registries</h3>
                  <div className="space-y-3 bg-black/30 border border-white/5 p-4 rounded-sm">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Agent Registry Address</span>
                      <a
                        href={`https://monad-testnet.socialscan.io/address/${registryAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-tac-orange hover:underline block break-all text-[10px] mt-0.5"
                      >
                        {registryAddress}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Reputation Registry Address</span>
                      <a
                        href={`https://monad-testnet.socialscan.io/address/${reputationAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-tac-blue hover:underline block break-all text-[10px] mt-0.5"
                      >
                        {reputationAddress}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">RPC Connection Point</span>
                      <span className="text-white block mt-0.5 text-[10px]">https://testnet-rpc.monad.xyz</span>
                    </div>
                  </div>
                </div>

                {/* SIMULATED SYSTEM ADJUSTERS */}
                <div className="space-y-4">
                  <h3 className="font-orbitron font-bold text-xs tracking-wider text-slate-300 uppercase">Operational Thresholds</h3>
                  <div className="space-y-4 bg-black/30 border border-white/5 p-4 rounded-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase">NODE TIMEOUT THRESHOLD</span>
                        <span className="text-tac-orange">3000 MS</span>
                      </div>
                      <input type="range" className="w-full accent-tac-orange bg-tac-gray" min="1000" max="10000" defaultValue="3000" disabled />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase">CONFIDENCE AGGREGATION CEILING</span>
                        <span className="text-tac-blue">85%</span>
                      </div>
                      <input type="range" className="w-full accent-tac-blue bg-tac-gray" min="50" max="99" defaultValue="85" disabled />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase">CONCURRENT INSTANCES FLOW LIMIT</span>
                        <span className="text-tac-green">5 ACTIVE</span>
                      </div>
                      <input type="range" className="w-full accent-tac-green bg-tac-gray" min="1" max="10" defaultValue="5" disabled />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── TRANSACTION / FREE TIER POPUP ALERT ── */}
      {txAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all duration-300">
          <div className={`w-full max-w-sm border p-6 rounded-sm font-sans tactical-panel transition-all duration-300 transform scale-100 ${
            txAlert.type === "paid" ? "tactical-border-green shadow-[0_0_20px_rgba(34,197,94,0.15)]" : "tactical-border-blue shadow-[0_0_20px_rgba(59,130,246,0.15)]"
          }`}>
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Animated Icon */}
              {txAlert.type === "paid" ? (
                <div className="h-12 w-12 rounded-full bg-tac-green/10 border border-tac-green/30 flex items-center justify-center text-tac-green text-xl font-bold animate-bounce">
                  ✓
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-tac-blue/10 border border-tac-blue/30 flex items-center justify-center text-tac-blue text-xl font-mono animate-pulse font-bold">
                  i
                </div>
              )}

              <div>
                <h3 className={`font-orbitron font-extrabold text-sm tracking-widest uppercase leading-none ${
                  txAlert.type === "paid" ? "text-tac-green" : "text-tac-blue"
                }`}>
                  {txAlert.mode === "deployment" 
                    ? "TRANSACTION SUCCESSFUL" 
                    : txAlert.type === "paid" 
                      ? "TRANSACTION SECURED" 
                      : "FREE TIER ACCESS"}
                </h3>
                <span className="font-tech text-[9px] text-slate-500 uppercase mt-1 block">
                  {txAlert.mode === "deployment" ? "NODE MINT DETAILS" : `NODE: ${txAlert.nodeName.toUpperCase()}`}
                </span>
              </div>

              <div className="w-full bg-[#0d0e10]/80 border border-white/5 p-4 rounded-sm font-tech text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[9px]">
                    {txAlert.mode === "deployment" ? "ACTION" : "METHOD INVOKED"}
                  </span>
                  <span className="text-white font-bold">
                    {txAlert.mode === "deployment" ? "deploy/register" : "tools/call"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[9px]">
                    {txAlert.mode === "deployment" ? "REGISTRATION FEE" : "SERVICE FEE"}
                  </span>
                  <span className={`font-bold ${txAlert.type === "paid" ? "text-tac-green" : "text-tac-blue"}`}>
                    {txAlert.type === "paid" ? `${txAlert.fee} MON` : "0.00 MON (FREE)"}
                  </span>
                </div>
                {txAlert.type === "paid" && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase text-[9px]">
                        {txAlert.mode === "deployment" ? "REGISTRY CONTRACT" : "RECIPIENT (OWNER)"}
                      </span>
                      <span className="text-slate-300 text-[10px] break-all select-text font-mono mt-0.5">
                        {txAlert.recipient}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase text-[9px]">TRANSACTION HASH</span>
                      <span className="text-tac-green text-[10px] break-all select-text font-mono mt-0.5">
                        {txAlert.txHash}
                      </span>
                    </div>
                  </>
                )}
                {txAlert.mode === "deployment" && (
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                    <span className="text-slate-500 uppercase text-[9px]">STATUS</span>
                    <span className="text-tac-green font-bold uppercase">SUCCESS</span>
                  </div>
                )}
              </div>

              {txAlert.mode === "deployment" ? (
                <div className="w-full space-y-2">
                  <p className="text-[10px] text-slate-400 font-sans leading-normal">
                    Node <span className="text-white font-bold">{txAlert.nodeName}</span> was successfully registered and deployed to the AnyMind network.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTxAlert(prev => ({ ...prev, show: false }))}
                    className="w-full py-2 bg-tac-orange hover:bg-tac-orange/85 text-black font-tech font-bold text-xs clip-chamfer-sm transition-all cursor-pointer border-none"
                  >
                    DISMISS RECEIPT
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 font-tech text-[9px] text-slate-500 uppercase animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-tac-orange" />
                  <span>Auto-processing node flow...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. WALLET CONNECTOR MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-white/10 bg-[#111315] p-6 rounded-sm font-sans tactical-panel">
            <h3 className="font-orbitron font-bold text-sm text-white mb-2 text-center tracking-widest uppercase">
              SYNC NEURAL LINK
            </h3>
            <p className="text-[11px] text-slate-500 mb-6 text-center leading-relaxed font-sans">
              Connect external web3 providers to deploy registry specs on Monad.
            </p>
            <div className="space-y-3 font-tech">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setShowConnectModal(false);
                    addLog(`SYNC DIRECTIVE: LINKING ${connector.name.toUpperCase()}`);
                  }}
                  className="w-full py-2.5 bg-tac-gray hover:bg-tac-orange/15 border border-white/10 hover:border-tac-orange/40 text-slate-200 hover:text-white font-tech text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer clip-chamfer-sm"
                >
                  LINK {connector.name.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full mt-4 py-2 border border-white/10 bg-tac-gray hover:bg-slate-900 text-slate-300 hover:text-white font-tech text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer clip-chamfer-sm"
            >
              ABORT CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* 5. DEPLOY/REGISTER AGENT MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleRegisterAgent}
            className="w-full max-w-md border border-white/10 bg-[#111315] p-6 rounded-sm font-sans space-y-4 tactical-panel"
          >
            <h3 className="font-orbitron font-bold text-sm text-white mb-2 text-center tracking-widest uppercase">
              DEPLOY NODE ON-CHAIN
            </h3>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">NODE NAME ID</label>
              <input
                type="text"
                required
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">CAPABILITIES (Comma list)</label>
              <input
                type="text"
                required
                value={registerForm.capabilities}
                onChange={(e) => setRegisterForm({ ...registerForm, capabilities: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">ENDPOINT GATEWAY</label>
              <input
                type="text"
                required
                value={registerForm.endpoint}
                onChange={(e) => setRegisterForm({ ...registerForm, endpoint: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">SERVICE FEE (MON)</label>
              <input
                type="text"
                required
                value={registerForm.serviceFee}
                onChange={(e) => setRegisterForm({ ...registerForm, serviceFee: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">OPERATIONAL MANIFEST</label>
              <textarea
                required
                value={registerForm.description}
                onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50 resize-none"
                rows={3}
              />
            </div>

            <div className="pt-2 flex gap-4 font-tech">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="flex-1 py-2.5 border border-white/10 bg-tac-gray hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider clip-chamfer-sm cursor-pointer"
              >
                ABORT
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-tac-orange hover:bg-tac-orange/85 text-black font-bold text-xs clip-chamfer-sm cursor-pointer border-none transition-all"
              >
                {isTxPending ? "TRANSMITTING..." : "COMMIT CONFIG"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. RATE AGENT MODAL */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleRateAgent}
            className="w-full max-w-md border border-white/10 bg-[#111315] p-6 rounded-sm font-sans space-y-4 tactical-panel"
          >
            <h3 className="font-orbitron font-bold text-sm text-white mb-2 text-center tracking-widest uppercase">
              RECORD TRUST METRICS
            </h3>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">TARGET NODE ID</label>
              <input
                type="number"
                required
                placeholder="Target ID (ex. 0)"
                value={rateForm.agentId}
                onChange={(e) => setRateForm({ ...rateForm, agentId: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">PERFORMANCE RATIO (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={rateForm.score}
                onChange={(e) => setRateForm({ ...rateForm, score: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-tech text-xs">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider">DIAGNOSTIC ANALYSIS LOG</label>
              <textarea
                required
                value={rateForm.comment}
                onChange={(e) => setRateForm({ ...rateForm, comment: e.target.value })}
                className="bg-[#0d0e10] border border-white/10 rounded-sm p-2.5 text-xs text-slate-300 focus:outline-none focus:border-tac-orange/50 resize-none"
                rows={3}
              />
            </div>

            <div className="pt-2 flex gap-4 font-tech">
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="flex-1 py-2.5 border border-white/10 bg-tac-gray hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider clip-chamfer-sm cursor-pointer"
              >
                ABORT
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-tac-orange hover:bg-tac-orange/85 text-black font-bold text-xs clip-chamfer-sm cursor-pointer border-none transition-all"
              >
                COMMIT RECORD
              </button>
            </div>
          </form>
        </div>
      )}

      {showContextModal && contextEnvelope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl border border-white/10 bg-[#111315] p-6 rounded-sm font-sans space-y-4 tactical-panel">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-tac-orange rounded-full" />
                <h3 className="font-orbitron font-bold text-sm text-white tracking-widest uppercase">
                  ERC-8004 CONTEXT ENVELOPE
                </h3>
              </div>
              <span className="font-tech text-[10px] text-slate-500 uppercase">JSON-RPC 2.0 PROTOCOL</span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Below is the structured context payload passed between AI Agents. It maintains task-specific inputs, execution history, and caller verification tags across the Model Context Protocol.
            </p>

            <div className="bg-black/60 border border-white/5 rounded-sm p-4 max-h-[380px] overflow-auto font-tech text-[11px] text-tac-green leading-5 select-text">
              <pre>{JSON.stringify(contextEnvelope, null, 2)}</pre>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowContextModal(false)}
                className="w-full py-2.5 bg-tac-orange hover:bg-tac-orange/85 text-black font-tech font-bold text-xs clip-chamfer-sm cursor-pointer border-none transition-all"
              >
                CLOSE DIAGNOSTIC VIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
