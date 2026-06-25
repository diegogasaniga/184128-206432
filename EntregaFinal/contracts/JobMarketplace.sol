// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JobMarketplace is ReentrancyGuard {
    enum Status { Open, Funded, Submitted, Completed, Rejected, Expired }

    struct Job {
        address client;
        address evaluator;
        address provider;
        string description;
        uint256 budget;
        uint256 expiresAt;
        Status status;
        bytes32 deliverableRef;
    }

    IERC20 public immutable token;
    Job[] private _jobs;

    error NotClient();
    error NotProvider();
    error NotEvaluator();
    error InvalidStatus(Status current);
    error ProviderAlreadySet();
    error NotExpired();
    error ZeroBudget();
    error ZeroEvaluator();
    error InvalidExpiry();

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed evaluator,
        address provider,
        string description,
        uint256 budget,
        uint256 expiresAt
    );
    event ProviderSet(uint256 indexed jobId, address provider);
    event JobFunded(uint256 indexed jobId);
    event JobSubmitted(uint256 indexed jobId, bytes32 deliverableRef);
    event JobCompleted(uint256 indexed jobId, bytes32 reason);
    event JobRejected(uint256 indexed jobId, bytes32 reason);
    event JobExpired(uint256 indexed jobId);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function createJob(
        string calldata description,
        uint256 budget,
        address evaluator,
        address provider,
        uint256 expiresAt
    ) external returns (uint256 jobId) {
        if (budget == 0) revert ZeroBudget();
        if (evaluator == address(0)) revert ZeroEvaluator();
        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        jobId = _jobs.length;
        _jobs.push(Job({
            client: msg.sender,
            evaluator: evaluator,
            provider: provider,
            description: description,
            budget: budget,
            expiresAt: expiresAt,
            status: Status.Open,
            deliverableRef: bytes32(0)
        }));

        emit JobCreated(jobId, msg.sender, evaluator, provider, description, budget, expiresAt);
    }

    function setProvider(uint256 jobId, address provider) external {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.client) revert NotClient();
        if (job.status != Status.Open) revert InvalidStatus(job.status);
        if (job.provider != address(0)) revert ProviderAlreadySet();

        job.provider = provider;
        emit ProviderSet(jobId, provider);
    }

    function fund(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.client) revert NotClient();
        if (job.status != Status.Open) revert InvalidStatus(job.status);

        job.status = Status.Funded;
        token.transferFrom(msg.sender, address(this), job.budget);
        emit JobFunded(jobId);
    }

    function submit(uint256 jobId, bytes32 deliverableRef) external {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.provider) revert NotProvider();
        if (job.status != Status.Funded) revert InvalidStatus(job.status);

        job.status = Status.Submitted;
        job.deliverableRef = deliverableRef;
        emit JobSubmitted(jobId, deliverableRef);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.evaluator) revert NotEvaluator();
        if (job.status != Status.Submitted) revert InvalidStatus(job.status);

        job.status = Status.Completed;
        token.transfer(job.provider, job.budget);
        emit JobCompleted(jobId, reason);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = _jobs[jobId];
        Status current = job.status;

        if (current == Status.Open) {
            if (msg.sender != job.client) revert NotClient();
            job.status = Status.Rejected;
        } else if (current == Status.Funded || current == Status.Submitted) {
            if (msg.sender != job.evaluator) revert NotEvaluator();
            job.status = Status.Rejected;
            token.transfer(job.client, job.budget);
        } else {
            revert InvalidStatus(current);
        }

        emit JobRejected(jobId, reason);
    }

    // No access control, no hooks — can never be blocked.
    function claimRefund(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        Status current = job.status;

        if (current != Status.Funded && current != Status.Submitted) revert InvalidStatus(current);
        if (block.timestamp <= job.expiresAt) revert NotExpired();

        job.status = Status.Expired;
        token.transfer(job.client, job.budget);
        emit JobExpired(jobId);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getJobCount() external view returns (uint256) {
        return _jobs.length;
    }
}
