// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Reputation {
    struct Rating {
        address rater;
        uint8 score; // 1 to 100
        string comment;
        uint256 timestamp;
    }

    // agentId => array of ratings
    mapping(uint256 => Rating[]) private _ratings;
    // agentId => average score (out of 100)
    mapping(uint256 => uint256) public agentReputation;

    event AgentRated(uint256 indexed agentId, address indexed rater, uint8 score, string comment);

    function rateAgent(uint256 agentId, uint8 score, string calldata comment) external {
        require(score > 0 && score <= 100, "Score must be between 1 and 100");

        _ratings[agentId].push(Rating({
            rater: msg.sender,
            score: score,
            comment: comment,
            timestamp: block.timestamp
        }));

        // Recompute average reputation
        uint256 total = 0;
        uint256 len = _ratings[agentId].length;
        for (uint256 i = 0; i < len; i++) {
            total += _ratings[agentId][i].score;
        }
        agentReputation[agentId] = total / len;

        emit AgentRated(agentId, msg.sender, score, comment);
    }

    function getRatingsCount(uint256 agentId) external view returns (uint256) {
        return _ratings[agentId].length;
    }

    function getRatings(uint256 agentId) external view returns (Rating[] memory) {
        return _ratings[agentId];
    }
}
