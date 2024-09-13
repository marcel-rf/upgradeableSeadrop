import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ERC721SeaDropUpgradeable, ISeaDropUpgradeable, WalterTheRabbit } from "../../typechain-types";
import CollectionConfig from "../config/CollectionConfig";
import { MAX_SUPPLY, seadropAddress } from "../config/constants";
import { deployContract } from "./common";
import { getTokenUri, instantiateContract } from "./common/base";

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

  it("sepolia set contract supply", async () => {
    console.info(`set contract supply ${MAX_SUPPLY}`);
    await nft
      .connect(owner)
      .setMaxSupply(MAX_SUPPLY);
    expect(await nft.maxSupply()).to. equal(MAX_SUPPLY);
  });


  it("sepolia set base uri", async () => {
    console.info(`set base uri ${CollectionConfig.publicMetadataUri}`);
    if (await nft.baseURI() == CollectionConfig.publicMetadataUri) {
      console.info(`already set`);
      return;
    }
    await nft
      .connect(owner)
      .setBaseURI(CollectionConfig.publicMetadataUri);
    expect(await nft.baseURI()).to. equal(CollectionConfig.publicMetadataUri);
  });

  it("sepolia check max supply", async () => {
    console.info(`check max supply`);
    expect(await nft.maxSupply()).to. equal(MAX_SUPPLY);

    expect(await nft.baseURI()).to. equal(CollectionConfig.publicMetadataUri);
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

    console.log(`mint transaction details ${transaction.value} hash: ${transaction.hash}`);


    const tokenUri = await getTokenUri(nft, owner, 1);
    console.log(`tokenUri ${tokenUri}`);


    // check the balance (this can fail in test/mainnet as it takes some time for confirmation)
    expect(await nft.balanceOf(ownerAddress)).to. equal(1);
  });
});
