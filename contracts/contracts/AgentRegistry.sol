// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentRegistry - Onchain registry for Operance AI agents
contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        address paymentWallet;
        uint256 pricePerRequest; // USDC with 6 decimals (8000 = $0.008)
        string name;
        string description;
        string capability;
        string endpointUrl;
        string baseName;
        bool active;
        uint256 createdAt;
        uint256 totalRequests;
        uint256 totalEarned;
    }

    mapping(uint256 => Agent) public agents;
    uint256 public agentCount;
    address public owner;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed agentOwner,
        address paymentWallet,
        string name,
        uint256 pricePerRequest
    );

    event RequestRecorded(
        uint256 indexed agentId,
        address indexed payer,
        uint256 amount,
        bytes32 txRef
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgentOwnerOrAdmin(uint256 agentId) {
        require(
            agents[agentId].owner == msg.sender || owner == msg.sender,
            "Not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAgent(
        address paymentWallet,
        uint256 pricePerRequest,
        string calldata name,
        string calldata description,
        string calldata capability,
        string calldata endpointUrl,
        string calldata baseName
    ) external returns (uint256) {
        uint256 agentId = agentCount;
        agentCount++;

        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            paymentWallet: paymentWallet,
            pricePerRequest: pricePerRequest,
            name: name,
            description: description,
            capability: capability,
            endpointUrl: endpointUrl,
            baseName: baseName,
            active: true,
            createdAt: block.timestamp,
            totalRequests: 0,
            totalEarned: 0
        });

        emit AgentRegistered(agentId, msg.sender, paymentWallet, name, pricePerRequest);
        return agentId;
    }

    function recordRequest(
        uint256 agentId,
        address payer,
        uint256 amount,
        bytes32 txRef
    ) external onlyOwner {
        require(agents[agentId].active, "Agent not active");
        agents[agentId].totalRequests++;
        agents[agentId].totalEarned += amount;
        emit RequestRecorded(agentId, payer, amount, txRef);
    }

    function updateAgent(
        uint256 agentId,
        uint256 pricePerRequest,
        string calldata description,
        string calldata endpointUrl
    ) external onlyAgentOwnerOrAdmin(agentId) {
        agents[agentId].pricePerRequest = pricePerRequest;
        agents[agentId].description = description;
        agents[agentId].endpointUrl = endpointUrl;
    }

    function setActive(uint256 agentId, bool active) external onlyAgentOwnerOrAdmin(agentId) {
        agents[agentId].active = active;
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function getActiveAgents() external view returns (Agent[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < agentCount; i++) {
            if (agents[i].active) activeCount++;
        }
        Agent[] memory result = new Agent[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < agentCount; i++) {
            if (agents[i].active) result[idx++] = agents[i];
        }
        return result;
    }

    function getAllAgents() external view returns (Agent[] memory) {
        Agent[] memory result = new Agent[](agentCount);
        for (uint256 i = 0; i < agentCount; i++) {
            result[i] = agents[i];
        }
        return result;
    }

    function getPlatformStats() external view returns (
        uint256 totalAgents,
        uint256 totalRequests,
        uint256 totalVolume
    ) {
        totalAgents = agentCount;
        for (uint256 i = 0; i < agentCount; i++) {
            totalRequests += agents[i].totalRequests;
            totalVolume += agents[i].totalEarned;
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
