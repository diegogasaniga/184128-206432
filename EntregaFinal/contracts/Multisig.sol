// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Programmatic multisig: N-of-M on-chain approvals before execution.
/// Design choice: signers are FIXED at deployment (no add/remove). See README.
contract Multisig {
    struct Proposal {
        address proposer;
        address to;
        uint256 value;
        bytes data;
        uint256 approvalCount;
        bool executed;
        bool cancelled;
    }

    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;

    Proposal[] private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address to, uint256 value);
    event Approved(uint256 indexed proposalId, address indexed signer);
    event Executed(uint256 indexed proposalId, address indexed executor);
    event Cancelled(uint256 indexed proposalId, address indexed proposer);

    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "Need at least one signer");
        require(_threshold > 0 && _threshold <= _signers.length, "Invalid threshold");

        for (uint256 i = 0; i < _signers.length; i++) {
            address s = _signers[i];
            require(s != address(0), "Invalid signer address");
            require(!isSigner[s], "Duplicate signer");
            isSigner[s] = true;
            signers.push(s);
        }
        threshold = _threshold;
    }

    receive() external payable {}

    function propose(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlySigner returns (uint256 proposalId) {
        proposalId = _proposals.length;
        _proposals.push(Proposal({
            proposer: msg.sender,
            to: to,
            value: value,
            data: data,
            approvalCount: 0,
            executed: false,
            cancelled: false
        }));
        emit ProposalCreated(proposalId, msg.sender, to, value);
    }

    function approve(uint256 proposalId) external onlySigner {
        Proposal storage p = _proposals[proposalId];
        require(!p.executed, "Already executed");
        require(!p.cancelled, "Cancelled");
        require(!hasApproved[proposalId][msg.sender], "Already approved");

        hasApproved[proposalId][msg.sender] = true;
        p.approvalCount++;
        emit Approved(proposalId, msg.sender);
    }

    function execute(uint256 proposalId) external onlySigner {
        Proposal storage p = _proposals[proposalId];
        require(!p.executed, "Already executed");
        require(!p.cancelled, "Cancelled");
        require(p.approvalCount >= threshold, "Below threshold");

        p.executed = true;
        (bool success,) = p.to.call{value: p.value}(p.data);
        require(success, "Execution failed");
        emit Executed(proposalId, msg.sender);
    }

    function cancel(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        require(msg.sender == p.proposer, "Not proposer");
        require(!p.executed, "Already executed");
        require(!p.cancelled, "Already cancelled");

        p.cancelled = true;
        emit Cancelled(proposalId, msg.sender);
    }

    function getProposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        address to,
        uint256 value,
        bytes memory data,
        uint256 approvalCount,
        bool executed,
        bool cancelled
    ) {
        require(proposalId < _proposals.length, "Invalid proposal");
        Proposal storage p = _proposals[proposalId];
        return (p.proposer, p.to, p.value, p.data, p.approvalCount, p.executed, p.cancelled);
    }
}
