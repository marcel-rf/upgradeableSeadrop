import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ERC721SeaDropUpgradeable, ISeaDropUpgradeable, WalterTheRabbit } from "../../typechain-types";
import CollectionConfig from "../config/CollectionConfig";
import { deployContract } from "./common";
import { getTokenUri, seadropAddress } from "./common/base";



describe("Hardhat Token (Mint)", function () {
  let nft: WalterTheRabbit;
  let owner: Signer;
  let ownerAddress: string;
  let externalAccount: Signer;
  let externalAccountAddress: string;
  const mintPrice = ethers.utils.parseEther("0.01");

  const approve = async () => {
    await nft
      .connect(owner)
      .approve(externalAccountAddress, 1);
  }


  before(async () => {
    const {
      nft: _nft,
      owner: _owner,
      ownerAddress: _ownerAddress,
      externalAccountAddress: _externalAccountAddress,
      externalAccount: _externalAccount,
    } = await loadFixture(deployContract);

    nft = _nft as WalterTheRabbit;
    owner = _owner;
    ownerAddress = _ownerAddress;
    externalAccountAddress = _externalAccountAddress;
    externalAccount = _externalAccount;

    console.log(`setting baseURI to ${CollectionConfig.publicMetadataUri}`);
    await nft.connect(owner).setBaseURI(CollectionConfig.publicMetadataUri);
  });

  it("fails if direct mint is disabled", async () => {
    // await expect(
    //   nft.connect(externalAccount).mint(1, externalAccountAddress)
    // ).to.be.revertedWith("Direct Mint is Disabled");
  });

  // it("enable direct mint by owner only", async () => {
  //   await expect(
  //     nft.connect(externalAccount).setDirectMint(true)
  //   ).to.be.revertedWith("OnlyOwner()");
  //
  //   await nft.connect(owner).setDirectMint(true);
  //   expect(await nft.directMintEnabled()).to.equal(true);
  // });

  it("set max supply by owner only", async () => {
    await expect(
      nft.connect(externalAccount).setMaxSupply(10)
    ).to.be.revertedWith("OnlyOwner()");

    // await nft.connect(owner).setMaxSupply(10);
    // expect(await nft.maxSupply()).to.equal(10);
  });

  // it("set mint price by owner only", async () => {
  //   await expect(
  //     nft.connect(externalAccount).setMintPrice(mintPrice)
  //   ).to.be.revertedWith("OnlyOwner()");
  //
  //   await nft.connect(owner).setMintPrice(mintPrice);
  //   expect(await nft.mintPrice()).to.equal(mintPrice);
  // });

  it("mints one token with invalid amount", async () => {
    await expect(
      nft
        .connect(externalAccount)
        .mint(seadropAddress, 1, externalAccountAddress, { value: mintPrice.div(2).toString() })
    ).to.be.revertedWith("Invalid ETH Amount for quantity");
  });


  it("mints one token", async () => {
    const transaction = await nft
      .connect(owner)
      .mint(seadropAddress, 1, ownerAddress, { value: mintPrice.toString() });
    expect(await nft.balanceOf(ownerAddress)).to.equal(1);
    console.log(`mint transaction details ${transaction.value} hash: ${transaction.hash}`);
    const tokenUri = await getTokenUri(nft, owner, 1);
  });

  it("mint to delegate address", async () => {
    console.log(`minting to external address ${externalAccountAddress}`);
    await nft
      .connect(externalAccount)
      .mint(seadropAddress,4, externalAccountAddress, { value: mintPrice.mul(4).toString() });
    expect(await nft.balanceOf(externalAccountAddress)).to.equal(4);
  });

  it("fails if exceed max supply", async () => {
    await expect(
      nft.connect(externalAccount).mint(seadropAddress, 20, externalAccountAddress, {
        value: mintPrice.mul(20).toString(),
      })
    ).to.be.revertedWith("Exceed Total Supply");
  });
});
