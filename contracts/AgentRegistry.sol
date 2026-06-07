// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract AgentRegistry is ERC721URIStorage {
    struct Agent {
        uint256 id;
        address owner;
        string name;
        string description;
        uint256 serviceFee; // Fee in wei/MON to invoke the agent
        string[] capabilities;
        bool active;
    }

    event AgentRegistered(
        uint256 indexed id,
        address indexed owner,
        string name,
        uint256 serviceFee
    );

    event AgentCalled(
        uint256 indexed id,
        address indexed caller,
        uint256 feePaid
    );

    event ServiceFeeUpdated(
        uint256 indexed id,
        uint256 newFee
    );

    uint256 public nextAgentId;
    mapping(uint256 => Agent) public agents;

    constructor() ERC721("Monad Agent Registry", "MON-AGENT") {}

    function registerAgent(
        string memory name,
        string memory description,
        string memory tokenURI,
        uint256 serviceFee,
        string[] memory capabilities
    ) external returns (uint256) {
        uint256 agentId = nextAgentId;
        
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, tokenURI);

        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            name: name,
            description: description,
            serviceFee: serviceFee,
            capabilities: capabilities,
            active: true
        });

        emit AgentRegistered(
            agentId,
            msg.sender,
            name,
            serviceFee
        );

        nextAgentId++;
        return agentId;
    }

    function getAgent(uint256 id) external view returns (Agent memory) {
        return agents[id];
    }

    function payAndCallAgent(uint256 agentId) external payable {
        Agent memory agent = agents[agentId];
        require(agent.active, "Agent is inactive");
        require(msg.value >= agent.serviceFee, "Insufficient service fee sent");

        if (agent.serviceFee > 0) {
            // Transfer service fee to agent owner
            (bool success, ) = payable(agent.owner).call{value: msg.value}("");
            require(success, "Transfer fee failed");
        }

        emit AgentCalled(agentId, msg.sender, msg.value);
    }

    function updateServiceFee(uint256 agentId, uint256 newFee) external {
        require(ownerOf(agentId) == msg.sender, "Only agent owner can update fee");
        agents[agentId].serviceFee = newFee;
        emit ServiceFeeUpdated(agentId, newFee);
    }

    function toggleAgentActive(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Only agent owner can toggle status");
        agents[agentId].active = !agents[agentId].active;
    }
}