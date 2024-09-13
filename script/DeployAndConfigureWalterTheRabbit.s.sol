// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";

import { ERC721SeaDrop } from "../src/ERC721SeaDrop.sol";

import { ISeaDrop } from "../src/interfaces/ISeaDrop.sol";

import { PublicDrop } from "../src/lib/SeaDropStructs.sol";
import "../src-upgradeable/src/ERC721SeaDropUpgradeable.sol";
import {WalterTheRabbit} from "../src-upgradeable/src/WalterTheRabbit.sol";

contract DeployAndConfigureWalterTheRabbit is Script {
    // Addresses
    address seadrop = 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5;

    //TODO update these
    address creator = 0x4293b1bEEb593423b3802021386C8F384AF917aE;
    address feeRecipient = 0x4293b1bEEb593423b3802021386C8F384AF917aE;

    // Token config
    uint256 maxSupply = 100;

    // Drop config
    uint16 feeBps = 500; // 5%
    uint80 mintPrice = 0.0001 ether;
    uint16 maxTotalMintableByWallet = 5;

    function run() external {
        vm.startBroadcast();

        address[] memory allowedSeadrop = new address[](1);
        allowedSeadrop[0] = seadrop;

        ERC721SeaDropUpgradeable token = new WalterTheRabbit(
            "WalterTheRabbit",
            "WTR",
            allowedSeadrop
        );

        // Configure the token.
        token.setMaxSupply(maxSupply);

        // Configure the drop parameters.
        token.updateCreatorPayoutAddress(seadrop, creator);
        token.updateAllowedFeeRecipient(seadrop, feeRecipient, true);
        token.updatePublicDrop(
            seadrop,
            PublicDrop(
                mintPrice,
                uint48(block.timestamp), // start time
                uint48(block.timestamp) + 1000, // end time
                maxTotalMintableByWallet,
                feeBps,
                true
            )
        );

        // We are ready, let's mint the first 3 tokens!
        ISeaDrop(seadrop).mintPublic{ value: mintPrice * 3 }(
            address(token),
            feeRecipient,
            address(0),
            3 // quantity
        );

        const tokenUri = token.tokenURI(1);
        console.info(`token uri ${tokenUri}`);
    }
}
