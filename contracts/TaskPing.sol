// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TaskPing — on-chain task confirmations & sign-offs on ARC
/// @notice Ping someone to confirm a task. Their confirmation is an immutable,
///         timestamped proof of sign-off. Attach an optional ARC bounty that is
///         escrowed and released to the assignee the moment they confirm.
contract TaskPing {
    enum Status { Pending, Confirmed, Declined, Cancelled }

    struct Ping {
        uint256 id;
        address from;       // requester
        address to;         // assignee who must confirm
        string title;       // short task / approval label
        uint256 bounty;     // ARC escrowed, released on confirm
        Status status;
        uint64 createdAt;
        uint64 resolvedAt;
    }

    uint256 public pingCount;
    uint256 public totalConfirmed;
    uint256 public totalEscrowed; // currently locked in the contract

    mapping(uint256 => Ping) public pings;
    mapping(address => uint256[]) private _sent;
    mapping(address => uint256[]) private _received;
    mapping(address => uint256) public confirmedCount; // reputation: sign-offs delivered

    event PingCreated(uint256 indexed id, address indexed from, address indexed to, string title, uint256 bounty);
    event PingConfirmed(uint256 indexed id, address indexed to, address indexed from, uint256 bounty);
    event PingDeclined(uint256 indexed id, address indexed to, address indexed from);
    event PingCancelled(uint256 indexed id, address indexed from);

    function createPing(address to, string calldata title) external payable returns (uint256) {
        require(to != address(0), "zero assignee");
        require(to != msg.sender, "self ping");
        require(bytes(title).length > 0, "empty title");
        require(bytes(title).length <= 120, "title too long");

        uint256 id = ++pingCount;
        pings[id] = Ping(id, msg.sender, to, title, msg.value, Status.Pending, uint64(block.timestamp), 0);
        _sent[msg.sender].push(id);
        _received[to].push(id);
        totalEscrowed += msg.value;
        emit PingCreated(id, msg.sender, to, title, msg.value);
        return id;
    }

    function confirm(uint256 id) external {
        Ping storage p = pings[id];
        require(p.to == msg.sender, "not assignee");
        require(p.status == Status.Pending, "not pending");

        p.status = Status.Confirmed;
        p.resolvedAt = uint64(block.timestamp);
        confirmedCount[msg.sender] += 1;
        totalConfirmed += 1;

        uint256 amount = p.bounty;
        if (amount > 0) {
            totalEscrowed -= amount;
            (bool ok, ) = payable(msg.sender).call{value: amount}("");
            require(ok, "payout failed");
        }
        emit PingConfirmed(id, msg.sender, p.from, amount);
    }

    function decline(uint256 id) external {
        Ping storage p = pings[id];
        require(p.to == msg.sender, "not assignee");
        require(p.status == Status.Pending, "not pending");

        p.status = Status.Declined;
        p.resolvedAt = uint64(block.timestamp);

        uint256 amount = p.bounty;
        if (amount > 0) {
            totalEscrowed -= amount;
            (bool ok, ) = payable(p.from).call{value: amount}(""); // refund requester
            require(ok, "refund failed");
        }
        emit PingDeclined(id, msg.sender, p.from);
    }

    function cancel(uint256 id) external {
        Ping storage p = pings[id];
        require(p.from == msg.sender, "not requester");
        require(p.status == Status.Pending, "not pending");

        p.status = Status.Cancelled;
        p.resolvedAt = uint64(block.timestamp);

        uint256 amount = p.bounty;
        if (amount > 0) {
            totalEscrowed -= amount;
            (bool ok, ) = payable(p.from).call{value: amount}("");
            require(ok, "refund failed");
        }
        emit PingCancelled(id, msg.sender);
    }

    function sentOf(address a) external view returns (uint256[] memory) { return _sent[a]; }
    function receivedOf(address a) external view returns (uint256[] memory) { return _received[a]; }
    function getPing(uint256 id) external view returns (Ping memory) { return pings[id]; }
}
