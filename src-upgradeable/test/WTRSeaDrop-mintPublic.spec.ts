import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network, upgrades } from "hardhat";

import { randomHex } from "../../test/utils/encoding";
import { faucet } from "../../test/utils/faucet";
import { VERSION } from "../../test/utils/helpers";

import type {
  ERC721SeaDrop,
  ERC721SeaDropUpgradeable, ISeaDrop,
  ISeaDropUpgradeable,
  WalterTheRabbit
} from "../../typechain-types";
import type { PublicDropStruct } from "../../typechain-types/WalterTheRabbit";
import type { Wallet } from "ethers";
import collectionConfig from "../config/CollectionConfig";
import CollectionConfig from "../config/CollectionConfig";

describe(`WTR SeaDropUpgradeable - Mint Public (v${VERSION})`, function() {
  const { provider } = ethers;
  let seadrop: ISeaDropUpgradeable;
  let token: WalterTheRabbit;
  let owner: Wallet;
  let creator: Wallet;
  let payer: Wallet;
  let minter: Wallet;
  let feeRecipient: Wallet;
  let publicDrop: PublicDropStruct;

  after(async () => {
    await network.provider.request({
      method: "hardhat_reset"
    });
  });

  before(async () => {
    // Set the wallets
    owner = new ethers.Wallet(randomHex(32), provider);
    creator = new ethers.Wallet(randomHex(32), provider);
    payer = new ethers.Wallet(randomHex(32), provider);
    minter = new ethers.Wallet(randomHex(32), provider);
    feeRecipient = new ethers.Wallet(randomHex(32), provider);

    // Add eth to wallets
    for (const wallet of [owner, payer, minter]) {
      await faucet(wallet.address, provider);
    }

    // Deploy Seadrop.
    const SeaDrop = await ethers.getContractFactory("ERC721SeaDropUpgradeable");
    seadrop = await SeaDrop.deploy() as ISeaDropUpgradeable;

    // // Deploy SeaDrop
    // const SeaDrop = await ethers.getContractFactory(
    //   "ERC721SeaDropUpgradeable",
    //   owner
    // );
    // seadrop = (await SeaDrop.deploy()) as ISeaDropUpgradeable;
    await seadrop.deployed();
    console.info(`contract Seadrop deployed to address: ${seadrop.address}`);
  });

  beforeEach(async () => {
    // Deploy token
    const ERC721SeaDropUpgradeable = await ethers.getContractFactory(
      "WalterTheRabbit",
      owner
    );
    const tokenName = "WalterTheRabbit";
    const tokenSymbol = "WTR";

    token = (await upgrades.deployProxy(
      ERC721SeaDropUpgradeable,
      [
        tokenName,
        tokenSymbol,
        [seadrop.address],
      ],
      { initializer: "initialize" }
    )) as WalterTheRabbit;

    await token.deployed();
    // token = (await upgrades.deployProxy(ERC721SeaDropUpgradeable, [
    //   tokenName, tokenSymbol, [
    //     seadrop.address
    //   ]
    // ])) as ERC721SeaDropUpgradeable;

    console.info(`deployed contract proxy to ${token.address} symbol: ${await token.symbol()} name: ${await token.name()}`);
    // Configure token
    await token.setMaxSupply(100);
    console.info("set max supply to 100");


    await token.setBaseURI(collectionConfig.publicMetadataUri);
    console.info(`setBaseURI to ${collectionConfig.publicMetadataUri}`);

    console.info(`updateCreatorPayoutAddress to seadrop: ${seadrop.address} creator: ${creator.address}`);
    // await token.updateCreatorPayoutAddress(seadrop.address, creator.address);
    console.info("updated creator payout address")
    publicDrop = {
      mintPrice: "100000000000000000", // 0.1 ether
      maxTotalMintableByWallet: 10,
      startTime: Math.round(Date.now() / 1000) - 100,
      endTime: Math.round(Date.now() / 1000) + 100,
      feeBps: 1000,
      restrictFeeRecipients: true
    };
    await token.updatePublicDrop(seadrop.address, publicDrop);
    // await token.updatePublicDrop(publicDrop);
    console.info("updated public drop")

    // await token.updateAllowedFeeRecipient(
    //   seadrop.address,
    //   feeRecipient.address,
    //   true
    // );
  });

  it("Should mint a public stage", async () => {
    // Mint public with payer for minter.
    const value = BigNumber.from(publicDrop.mintPrice).mul(3);
    console.info(`mintPublic to WTR address: ${token.address}`);
    await expect(
      seadrop
        .connect(owner)
        .mintPublic(token.address, feeRecipient.address, minter.address, 3, {
          value
        })
    ).to.be.revertedWith("PayerNotAllowed");

    expect(await seadrop.getPayers(token.address)).to.deep.eq([]);
    expect(await seadrop.getPayerIsAllowed(token.address, payer.address)).to.eq(
      false
    );

    // Allow the payer.
    await token.updatePayer(seadrop.address, payer.address, true);

    expect(await seadrop.getPayers(token.address)).to.deep.eq([payer.address]);
    expect(await seadrop.getPayerIsAllowed(token.address, payer.address)).to.eq(
      true
    );

    await expect(
      seadrop
        .connect(payer)
        .mintPublic(token.address, feeRecipient.address, minter.address, 3, {
          value
        })
    )
      .to.emit(seadrop, "SeaDropMint")
      .withArgs(
        token.address,
        minter.address,
        feeRecipient.address,
        payer.address,
        3, // mint quantity
        publicDrop.mintPrice,
        publicDrop.feeBps,
        0 // drop stage index (0 for public)
      );

    let minterBalance = await token.balanceOf(minter.address);
    expect(minterBalance).to.eq(3);
    expect(await token.totalSupply()).to.eq(3);

    expect(await token.tokenURI(1)).to.contain(
      CollectionConfig.publicMetadataUri
    );

    // Mint public with minter being payer.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          3,
          { value }
        )
    )
      .to.emit(seadrop, "SeaDropMint")
      .withArgs(
        token.address,
        minter.address,
        feeRecipient.address,
        minter.address, // payer
        3, // mint quantity
        publicDrop.mintPrice,
        publicDrop.feeBps,
        0 // drop stage index (0 for public)
      );

    minterBalance = await token.balanceOf(minter.address);
    expect(minterBalance).to.eq(6);
    expect(await token.totalSupply()).to.eq(6);
  });

  it("Token Uri should contain the correct ipfs value", async () => {
    // If using pre-reveal = false
    // expect(await contract.tokenURI(1)).to.equal(CollectionConfig.hiddenMetadataUri);
    // If using pre-reveal = true ex: ipfs://QmVFadct8kkXQRmpgBDQnq63AQM5gk7he1RdJBg1EJu3PA/1.json should contain the public metadata uri: ipfs://QmVFadct8kkXQRmpgBDQnq63AQM5gk7he1RdJBg1EJu3PA
    expect(await token.tokenURI(1)).to.contain(
      CollectionConfig.publicMetadataUri
    );
  });

  it("Should not mint a public stage that hasn't started", async () => {
    // Set start time in the future.
    await token.updatePublicDrop(seadrop.address, {
      ...publicDrop,
      startTime: Math.round(Date.now() / 1000) + 100
    });

    // Mint public with payer for minter.
    const value = BigNumber.from(publicDrop.mintPrice).mul(3);
    await expect(
      seadrop
        .connect(payer)
        .mintPublic(token.address, feeRecipient.address, minter.address, 3, {
          value
        })
    ).to.be.revertedWith("NotActive");

    // Mint public with minter being payer.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          3,
          { value }
        )
    ).to.be.revertedWith("NotActive");
  });

  it("Should not mint a public stage that has ended", async () => {
    // Set start time in the future.
    await token.updatePublicDrop(seadrop.address, {
      ...publicDrop,
      endTime: Math.round(Date.now() / 1000) - 100
    });

    // Mint public with payer for minter.
    const value = BigNumber.from(publicDrop.mintPrice).mul(3);
    await expect(
      seadrop
        .connect(payer)
        .mintPublic(token.address, feeRecipient.address, minter.address, 3, {
          value
        })
    ).to.be.revertedWith("NotActive");

    // Mint public with minter being payer.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          3,
          { value }
        )
    ).to.be.revertedWith("NotActive");
  });

  it("Should respect limit for max mints per wallet and max supply", async () => {
    // Update max limit per wallet to 2.
    publicDrop.maxTotalMintableByWallet = 2;
    await token.updatePublicDrop(seadrop.address, publicDrop);

    // Update max supply to 1.
    await token.setMaxSupply(1);

    // Mint one.
    const value = publicDrop.mintPrice;
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(token.address, feeRecipient.address, minter.address, 1, {
          value
        })
    )
      .to.emit(seadrop, "SeaDropMint")
      .withArgs(
        token.address,
        minter.address,
        feeRecipient.address,
        minter.address, // payer
        1, // mint quantity
        publicDrop.mintPrice,
        publicDrop.feeBps,
        0 // drop stage index (0 for public)
      );

    // Minting the next should throw MintQuantityExceedsMaxSupply.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(token.address, feeRecipient.address, minter.address, 1, {
          value
        })
    ).to.be.revertedWith("MintQuantityExceedsMaxSupply");

    // Update max supply to 3.
    await token.setMaxSupply(3);

    // Mint one.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          1,
          {
            value
          }
        )
    )
      .to.emit(seadrop, "SeaDropMint")
      .withArgs(
        token.address,
        minter.address,
        feeRecipient.address,
        minter.address, // payer
        1, // mint quantity
        publicDrop.mintPrice,
        publicDrop.feeBps,
        0 // drop stage index (0 for public)
      );

    // Minting the next should throw MintQuantityExceedsMaxMintedPerWallet.
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(token.address, feeRecipient.address, minter.address, 1, {
          value
        })
    ).to.be.revertedWith("MintQuantityExceedsMaxMintedPerWallet");
  });

  it("Should not mint with incorrect payment", async () => {
    // Pay for only 1 mint, but request quantity of 2.
    let value = BigNumber.from(publicDrop.mintPrice);
    let mintQuantity = 2;

    await expect(
      seadrop
        .connect(payer)
        .mintPublic(
          token.address,
          feeRecipient.address,
          minter.address,
          mintQuantity,
          {
            value
          }
        )
    ).to.be.revertedWith("IncorrectPayment");

    // Pay for 3 mints but request quantity of 2.
    value = BigNumber.from(publicDrop.mintPrice).mul(3);
    mintQuantity = 2;
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          mintQuantity,
          { value }
        )
    ).to.be.revertedWith("IncorrectPayment");
  });

  it("Should not mint with invalid fee recipient", async () => {
    const value = BigNumber.from(publicDrop.mintPrice);
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          ethers.constants.AddressZero,
          minter.address,
          1,
          {
            value
          }
        )
    ).to.be.revertedWith("FeeRecipientCannotBeZeroAddress");

    await expect(
      seadrop
        .connect(minter)
        .mintPublic(token.address, creator.address, minter.address, 1, {
          value
        })
    ).to.be.revertedWith("FeeRecipientNotAllowed");
  });

  it("Should not be able to set an invalid fee bps", async () => {
    await expect(
      token.updatePublicDrop(seadrop.address, { ...publicDrop, feeBps: 15_000 })
    ).to.be.revertedWith("InvalidFeeBps");
  });

  it("Should mint when feeBps is zero", async () => {
    await token.updatePublicDrop(seadrop.address, { ...publicDrop, feeBps: 0 });

    await expect(
      seadrop
        .connect(minter)
        .mintPublic(
          token.address,
          feeRecipient.address,
          ethers.constants.AddressZero,
          1,
          {
            value: publicDrop.mintPrice
          }
        )
    )
      .to.emit(seadrop, "SeaDropMint")
      .withArgs(
        token.address,
        minter.address,
        feeRecipient.address,
        minter.address, // payer
        1, // mint quantity
        publicDrop.mintPrice,
        0, // fee bps
        0 // drop stage index (0 for public)
      );
  });

  it("Should not be able to mint zero quantity", async () => {
    await expect(
      seadrop
        .connect(minter)
        .mintPublic(token.address, feeRecipient.address, minter.address, 0)
    ).to.be.revertedWith("MintQuantityCannotBeZero");
  });
});
