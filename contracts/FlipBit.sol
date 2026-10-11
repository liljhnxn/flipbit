// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlipBit
 * @notice A simple on-chain coin-flipping demonstration smart contract.
 * @dev NOTE: Uses pseudo-randomness based on block data and an internal nonce.
 *      This is for entertainment and learning only; it is not secure randomness for financial applications.
 */
contract FlipBit {
    // 0 = HEADS (🟡), 1 = TAILS (🔵)
    enum CoinSide {
        Heads, // 0
        Tails  // 1
    }

    // Total number of flips performed across all users
    uint256 public totalFlips;

    // Internal nonce to vary entropy
    uint256 private _nonce;

    // Mapping of user address to their latest flip result
    mapping(address => CoinSide) public latestResult;

    // Mapping to track if a user has ever flipped a coin
    mapping(address => bool) public hasFlipped;

    // Emitted whenever a user flips the coin
    event CoinFlipped(
        address indexed user,
        CoinSide result,
        uint256 flipNumber
    );

    /**
     * @notice Flips the coin on-chain.
     * @dev Generates a pseudo-random Heads or Tails result, increments total flips,
     *      stores caller's most recent result, and emits CoinFlipped event.
     * @return result The generated result (0 for Heads, 1 for Tails).
     */
    function flip() external returns (CoinSide result) {
        _nonce++;
        totalFlips++;

        // Pseudo-random generation based on block attributes and nonce
        bytes32 pseudoRandomHash = keccak256(
            abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                msg.sender,
                _nonce,
                totalFlips
            )
        );

        result = (uint256(pseudoRandomHash) % 2 == 0) ? CoinSide.Heads : CoinSide.Tails;

        latestResult[msg.sender] = result;
        hasFlipped[msg.sender] = true;

        emit CoinFlipped(msg.sender, result, totalFlips);

        return result;
    }

    /**
     * @notice Returns the total number of flips recorded by the contract.
     * @return The total flip count.
     */
    function getTotalFlips() external view returns (uint256) {
        return totalFlips;
    }

    /**
     * @notice Returns the caller's most recent result and whether they have flipped yet.
     * @param user The address of the user to query.
     * @return result The latest result (Heads or Tails).
     * @return flipped True if the user has flipped at least once.
     */
    function getUserLatestResult(address user) external view returns (CoinSide result, bool flipped) {
        return (latestResult[user], hasFlipped[user]);
    }
}
