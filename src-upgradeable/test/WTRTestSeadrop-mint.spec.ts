import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ERC721SeaDropUpgradeable, ISeaDropUpgradeable, WalterTheRabbit } from "../../typechain-types";
import { deployContract } from "./common";
import { getTokenUri, instantiateContract, seadropAddress } from "./common/base";

describe("Sepolia Token (Mint)", function () {
  let nft: WalterTheRabbit;
  let owner: Signer;
  let ownerAddress: string;
  let externalAccount: Signer;
  let externalAccountAddress: string;
  const mintPrice = ethers.utils.parseEther("0.01");

  before(async () => {
    const {
      nft: _nft,
      owner: _owner,
      ownerAddress: _ownerAddress,
      externalAccount: _externalAccount,
    } = await instantiateContract();

    nft = _nft as WalterTheRabbit;
    owner = _owner;
    ownerAddress = _ownerAddress;
    externalAccount = _externalAccount;
  });

  it("sepolia set stuff", async () => {
    console.info(`mint with invalid amount ${ownerAddress}`);

    // await nft
    //   .connect(owner)
    //   .updateCreatorPayoutAddress(seadropAddress, ownerAddress);

    //expect(await nft.balanceOf(externalAccountAddress)).to.equal(1);
  });

  it("sepolia mints token with invalid amount", async () => {
    console.info(`mint with invalid amount ${ownerAddress}`);
    await expect(
      nft
        .connect(owner)
        .mint(seadropAddress, 1, ownerAddress, { value: mintPrice.div(2).toString() })
    ).to.be.revertedWith("Invalid ETH Amount");
  });

  it("sepolia mints one token", async () => {
    console.info(`mint with valid amount to owner: ${ownerAddress} with seadrop address: ${seadropAddress}`);
    const transaction = await nft
      .connect(owner)
      .mint(seadropAddress, 1, ownerAddress, { value: mintPrice.toString() });
    expect(await nft.balanceOf(ownerAddress)).to. equal(1);
    console.log(`mint transaction details ${transaction.value} hash: ${transaction.hash}`);
    const tokenUri = await getTokenUri(nft, owner, 1);
  });
});
