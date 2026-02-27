---
name: "Solidity"
description: "Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow)."
version: "1.0.0"
category: "languages"
author: "Rulebook"
tags: ["languages", "language"]
dependencies: []
conflicts: []
---
<!-- SOLIDITY:START -->
# Solidity Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence (Hardhat):
npx hardhat compile       # Compilation check
npx hardhat test          # All tests (100% pass)
npx hardhat coverage      # Coverage check
npx slither .             # Security analysis

# Or with Foundry:
forge build               # Compilation
forge test                # All tests
forge coverage            # Coverage
slither .                 # Security scan

# Gas optimization check:
npx hardhat test --gas
```

## Solidity Configuration

**CRITICAL**: Use Solidity 0.8.20+ with strict compiler settings and comprehensive testing.

- **Version**: Solidity 0.8.20+
- **Recommended**: Solidity 0.8.26+
- **Framework**: Hardhat or Foundry
- **Testing**: Hardhat tests or Foundry tests
- **Linter**: Solhint
- **Formatter**: Prettier with prettier-plugin-solidity
- **Security**: Slither, Mythril for static analysis

### hardhat.config.js Requirements

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["storageLayout"]
        }
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### foundry.toml Requirements (Alternative)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.26"
optimizer = true
optimizer_runs = 200
via_ir = true
verbosity = 3

[profile.ci]
fuzz = { runs = 10000 }
invariant = { runs = 1000 }

[fmt]
line_length = 100
tab_width = 4
bracket_spacing = true
int_types = "long"
quote_style = "double"
number_underscore = "thousands"
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist - Hardhat (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
npx prettier --check 'contracts/**/*.sol' 'test/**/*.js'

# 2. Lint (MUST pass with no warnings - matches workflow)
npx solhint 'contracts/**/*.sol'

# 3. Compile (matches workflow)
npx hardhat compile

# 4. Run all tests (MUST pass 100% - matches workflow)
npx hardhat test

# 5. Gas report (matches workflow)
REPORT_GAS=true npx hardhat test

# 6. Coverage (MUST meet threshold - matches workflow)
npx hardhat coverage

# 7. Security analysis (matches workflow)
slither .
# or: mythril analyze contracts/MyContract.sol

# Pre-Commit Checklist - Foundry (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
forge fmt --check

# 2. Build (matches workflow)
forge build

# 3. Run all tests (MUST pass 100% - matches workflow)
forge test -vvv

# 4. Coverage (matches workflow)
forge coverage

# 5. Gas snapshot (matches workflow)
forge snapshot --check

# 6. Security analysis (matches workflow)
slither .

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes deployment failures
- Smart contract bugs can lead to financial losses
- Example: Using `prettier --write` locally but `prettier --check` in CI = failure
- Example: Skipping security analysis locally = vulnerabilities deployed to mainnet
- Example: Missing gas optimization = expensive contract operations

### Security Best Practices

**CRITICAL**: Smart contracts handle real value - security is paramount!

```solidity
// ✅ GOOD: Secure patterns
pragma solidity 0.8.26;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SecureVault is ReentrancyGuard, Ownable {
    mapping(address => uint256) private balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    // Checks-Effects-Interactions pattern
    function withdraw(uint256 amount) external nonReentrant {
        // Checks
        require(amount > 0, "Amount must be positive");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Effects
        balances[msg.sender] -= amount;
        emit Withdrawal(msg.sender, amount);
        
        // Interactions
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function deposit() external payable {
        require(msg.value > 0, "Must deposit positive amount");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}

// ❌ BAD: Vulnerable to reentrancy
contract InsecureVault {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount);
        
        // DANGER: External call before state update!
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        
        balances[msg.sender] -= amount;  // TOO LATE - already reentered!
    }
}
```

### Testing

- **Framework**: Hardhat (Mocha/Chai) or Foundry (Forge)
- **Location**: `/test` directory
- **Coverage**: Must meet threshold (90%+)
- **Invariant Testing**: Use property-based testing
- **Fork Testing**: Test against mainnet forks

Example Hardhat test:
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureVault", function () {
  let vault;
  let owner;
  let addr1;
  let addr2;
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Vault = await ethers.getContractFactory("SecureVault");
    vault = await Vault.deploy();
    await vault.deployed();
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });
  });
  
  describe("Deposits", function () {
    it("Should accept deposits", async function () {
      const depositAmount = ethers.utils.parseEther("1.0");
      
      await expect(vault.connect(addr1).deposit({ value: depositAmount }))
        .to.emit(vault, "Deposit")
        .withArgs(addr1.address, depositAmount);
      
      expect(await vault.getBalance(addr1.address)).to.equal(depositAmount);
    });
    
    it("Should reject zero deposits", async function () {
      await expect(
        vault.connect(addr1).deposit({ value: 0 })
      ).to.be.revertedWith("Must deposit positive amount");
    });
  });
  
  describe("Withdrawals", function () {
    beforeEach(async function () {
      await vault.connect(addr1).deposit({ value: ethers.utils.parseEther("2.0") });
    });
    
    it("Should allow withdrawals", async function () {
      const withdrawAmount = ethers.utils.parseEther("1.0");
      
      await expect(vault.connect(addr1).withdraw(withdrawAmount))
        .to.emit(vault, "Withdrawal")
        .withArgs(addr1.address, withdrawAmount);
      
      expect(await vault.getBalance(addr1.address))
        .to.equal(ethers.utils.parseEther("1.0"));
    });
    
    it("Should prevent withdrawal of more than balance", async function () {
      await expect(
        vault.connect(addr1).withdraw(ethers.utils.parseEther("10.0"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });
});
```

Example Foundry test:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import "../src/SecureVault.sol";

contract SecureVaultTest is Test {
    SecureVault public vault;
    address public alice;
    address public bob;
    
    function setUp() public {
        vault = new SecureVault();
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }
    
    function testDeposit() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        
        assertEq(vault.getBalance(alice), 1 ether);
        vm.stopPrank();
    }
    
    function testWithdraw() public {
        vm.startPrank(alice);
        vault.deposit{value: 2 ether}();
        
        uint256 balanceBefore = alice.balance;
        vault.withdraw(1 ether);
        
        assertEq(vault.getBalance(alice), 1 ether);
        assertEq(alice.balance, balanceBefore + 1 ether);
        vm.stopPrank();
    }
    
    function testCannotWithdrawMoreThanBalance() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        
        vm.expectRevert("Insufficient balance");
        vault.withdraw(2 ether);
        vm.stopPrank();
    }
    
    // Fuzz testing
    function testFuzzDeposit(uint256 amount) public {
        vm.assume(amount > 0 && amount < 100 ether);
        
        vm.deal(alice, amount);
        vm.prank(alice);
        vault.deposit{value: amount}();
        
        assertEq(vault.getBalance(alice), amount);
    }
    
    // Invariant testing
    function invariant_totalBalanceMatchesContract() public {
        assertEq(address(vault).balance, vault.totalDeposits());
    }
}
```

## Security Auditing

**CRITICAL**: Run multiple security tools before deployment!

### Static Analysis Tools

```bash
# Slither (comprehensive)
slither . --exclude-optimization --exclude-informational

# Mythril (symbolic execution)
myth analyze contracts/MyContract.sol

# Manticore (symbolic execution)
manticore contracts/MyContract.sol

# Echidna (fuzzing)
echidna-test contracts/MyContract.sol --contract MyContract

# Solhint (linting with security rules)
solhint 'contracts/**/*.sol'
```

### Manual Review Checklist

- [ ] Reentrancy protection (ReentrancyGuard or Checks-Effects-Interactions)
- [ ] Integer overflow protection (use Solidity 0.8+)
- [ ] Access control (Ownable, AccessControl)
- [ ] Input validation (require statements)
- [ ] Gas optimization reviewed
- [ ] Event emissions for all state changes
- [ ] No use of tx.origin (use msg.sender)
- [ ] No use of block.timestamp for critical logic
- [ ] No delegatecall to untrusted contracts
- [ ] No selfdestruct in upgradeable contracts

## Gas Optimization

```solidity
// ✅ GOOD: Gas-optimized patterns
contract Optimized {
    // Use immutable for constants set in constructor
    address public immutable owner;
    
    // Pack struct variables
    struct User {
        uint128 balance;      // 16 bytes
        uint64 lastUpdated;   // 8 bytes
        uint64 nonce;         // 8 bytes
        // Total: 32 bytes (1 storage slot)
    }
    
    // Cache storage variables
    function processUsers(uint256[] calldata ids) external {
        User storage user;  // Declare once
        for (uint256 i = 0; i < ids.length; i++) {
            user = users[ids[i]];  // Cache
            user.balance += 100;
        }
    }
    
    // Use calldata for read-only arrays
    function sum(uint256[] calldata numbers) external pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
        return total;
    }
}

// ❌ BAD: Gas-inefficient
contract Inefficient {
    address public owner;  // Should be immutable!
    
    struct User {
        uint256 balance;     // 32 bytes
        uint256 lastUpdated; // 32 bytes
        uint256 nonce;       // 32 bytes
        // Total: 96 bytes (3 storage slots!)
    }
    
    // Repeated storage access
    function processUsers(uint256[] memory ids) external {
        for (uint256 i = 0; i < ids.length; i++) {
            users[ids[i]].balance += 100;  // SLOAD every iteration!
        }
    }
}
```

## Best Practices

### DO's ✅

- **USE** OpenZeppelin contracts for standard functionality
- **USE** ReentrancyGuard for functions with external calls
- **USE** SafeMath patterns or Solidity 0.8+ (automatic overflow checks)
- **EMIT** events for all state changes
- **VALIDATE** all inputs with require statements
- **TEST** with mainnet forks for realistic scenarios
- **OPTIMIZE** gas usage
- **DOCUMENT** all public functions with NatSpec

### DON'Ts ❌

- **NEVER** use tx.origin for authorization
- **NEVER** use block.timestamp for critical randomness
- **NEVER** make external calls before state updates (reentrancy!)
- **NEVER** use delegatecall without extreme caution
- **NEVER** deploy without security audit
- **NEVER** use floating pragma (`pragma solidity ^0.8.0`)
- **NEVER** skip test coverage
- **NEVER** ignore Slither warnings

## NatSpec Documentation

```solidity
/// @title Secure Vault Contract
/// @author Your Name
/// @notice This contract allows users to deposit and withdraw ETH
/// @dev Uses ReentrancyGuard to prevent reentrancy attacks
contract SecureVault is ReentrancyGuard {
    
    /// @notice Deposits ETH into the vault
    /// @dev Emits Deposit event on success
    /// @return success Boolean indicating if deposit was successful
    function deposit() external payable returns (bool success) {
        require(msg.value > 0, "Must deposit positive amount");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
        return true;
    }
    
    /// @notice Withdraws ETH from the vault
    /// @dev Uses Checks-Effects-Interactions pattern
    /// @param amount The amount of ETH to withdraw
    /// @custom:security Protected against reentrancy
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        emit Withdrawal(msg.sender, amount);
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

## CI/CD Requirements

Must include GitHub Actions workflows:

1. **Testing** (`solidity-test.yml`):
   - Run Hardhat/Foundry tests
   - Fork testing against mainnet
   - Coverage reporting (90%+ required)

2. **Security** (`solidity-security.yml`):
   - Slither static analysis
   - Mythril symbolic execution
   - Gas optimization check

3. **Linting** (`solidity-lint.yml`):
   - Solhint checks
   - Prettier formatting
   - Compile verification

## Deployment Checklist

**CRITICAL**: Before mainnet deployment!

- [ ] All tests passing (100%)
- [ ] Coverage > 90%
- [ ] Slither audit clean
- [ ] Mythril audit clean
- [ ] External security audit completed
- [ ] Gas optimization reviewed
- [ ] All functions have NatSpec comments
- [ ] Deployed to testnet and verified
- [ ] Contract verified on Etherscan
- [ ] Multi-sig wallet setup for admin functions
- [ ] Emergency pause mechanism tested
- [ ] Upgrade path documented (if upgradeable)

## Publishing to NPM (Hardhat)

```bash
# 1. Run all quality checks
npm run lint
npm test
npx hardhat coverage

# 2. Update version
npm version minor

# 3. Publish
npm publish
```

<!-- SOLIDITY:END -->

