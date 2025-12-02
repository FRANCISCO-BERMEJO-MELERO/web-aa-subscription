// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SimpleAccount
 * @notice Minimal ERC-4337 compliant smart account with single owner
 * @dev Supports ERC-7579 module installation for subscription functionality
 */
contract SimpleAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;

    // Validation constants
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    // ERC-7579 module storage
    mapping(address => bool) public installedModules;

    event SimpleAccountInitialized(
        IEntryPoint indexed entryPoint,
        address indexed owner
    );
    event ModuleInstalled(address indexed module);
    event ModuleUninstalled(address indexed module);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == address(_entryPoint),
            "Only owner or EntryPoint"
        );
        _;
    }

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * @notice Initialize the account with an owner
     * @param anOwner The owner address
     */
    function initialize(address anOwner) public virtual initializer {
        require(anOwner != address(0), "Invalid owner");
        owner = anOwner;
        emit SimpleAccountInitialized(_entryPoint, owner);
    }

    /**
     * @notice Execute a transaction (called by EntryPoint or owner)
     * @param dest Destination address
     * @param value ETH value
     * @param func Calldata
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyOwnerOrEntryPoint {
        _call(dest, value, func);
    }

    /**
     * @notice Execute a batch of transactions
     * @param dest Array of destination addresses
     * @param value Array of ETH values
     * @param func Array of calldata
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyOwnerOrEntryPoint {
        require(
            dest.length == func.length && dest.length == value.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /**
     * @notice Install an ERC-7579 module
     * @param module Module address
     * @param initData Initialization data for the module
     */
    function installModule(
        address module,
        bytes calldata initData
    ) external onlyOwner {
        require(!installedModules[module], "Module already installed");
        installedModules[module] = true;

        // Call module's onInstall hook if it exists
        if (initData.length > 0) {
            (bool success, ) = module.call(
                abi.encodeWithSignature("onInstall(bytes)", initData)
            );
            require(success, "Module installation failed");
        }

        emit ModuleInstalled(module);
    }

    /**
     * @notice Uninstall an ERC-7579 module
     * @param module Module address
     * @param deinitData Deinitialization data
     */
    function uninstallModule(
        address module,
        bytes calldata deinitData
    ) external onlyOwner {
        require(installedModules[module], "Module not installed");
        installedModules[module] = false;

        // Call module's onUninstall hook if it exists
        if (deinitData.length > 0) {
            (bool success, ) = module.call(
                abi.encodeWithSignature("onUninstall(bytes)", deinitData)
            );
            require(success, "Module uninstallation failed");
        }

        emit ModuleUninstalled(module);
    }

    /**
     * @notice Check if a module is installed
     * @param module Module address
     * @return bool True if installed
     */
    function isModuleInstalled(address module) external view returns (bool) {
        return installedModules[module];
    }

    // BaseAccount implementation

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);

        if (recovered != owner) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * @notice Deposit ETH to the EntryPoint for gas payments
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Withdraw ETH from EntryPoint
     * @param withdrawAddress Address to receive the funds
     * @param amount Amount to withdraw
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Get deposit info from EntryPoint
     * @return info Deposit info
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    // UUPS upgrade authorization
    function _authorizeUpgrade(
        address newImplementation
    ) internal view override onlyOwner {}

    // Allow receiving ETH
    receive() external payable {}
}
