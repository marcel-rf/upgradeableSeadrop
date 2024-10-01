import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { ISeaDropUpgradeable } from "../../typechain-types/interfaces";
import type { PublicDropStruct } from "../../typechain-types/src/ERC721SeaDrop";
import { WalterTheRabbit } from "../../typechain-types/WalterTheRabbit";
import CollectionConfig from "../config/CollectionConfig";
import { MAX_SUPPLY } from "../config/constants";
import { deployContract } from "./__fixtures__";
import { getTokenUri } from "./__fixtures__/base";


describe("Hardhat Token (Mint)", function () {
  let seadrop: ISeaDropUpgradeable;
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
      seadrop: _seadrop,
      nft: _nft,
      owner: _owner,
      ownerAddress: _ownerAddress,
      externalAccountAddress: _externalAccountAddress,
      externalAccount: _externalAccount,
    } = await loadFixture(deployContract);

    seadrop = _seadrop as ISeaDropUpgradeable;
    nft = _nft as WalterTheRabbit;
    owner = _owner;
    ownerAddress = _ownerAddress;
    externalAccountAddress = _externalAccountAddress;
    externalAccount = _externalAccount;

    console.log(`setting baseURI to ${CollectionConfig.publicMetadataUri}`);
    await nft.connect(owner).setBaseURI(CollectionConfig.publicMetadataUri);
    await nft.connect(owner).setMaxSupply(MAX_SUPPLY);
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
        .mint(seadrop.address, 1, externalAccountAddress, { value: mintPrice.div(2).toString() })
    ).to.be.revertedWith("Invalid ETH Amount for quantity");
  });


  it("hardhat mints one token", async () => {
    const transaction = await nft
      .connect(owner)
      .mint(seadrop.address, 1, ownerAddress, { value: mintPrice.toString() });
    expect(await nft.balanceOf(ownerAddress)).to.equal(1);
    console.log(`mint transaction details ${transaction.value} hash: ${transaction.hash}`);
    const tokenUri = await getTokenUri(nft, owner, 1);
    console.info(`tokenUri ${tokenUri}`);
  });

  it("mint to delegate address", async () => {
    console.log(`minting to external address ${externalAccountAddress}`);
    await nft
      .connect(externalAccount)
      .mint(seadrop.address,4, externalAccountAddress, { value: mintPrice.mul(4).toString() });
    expect(await nft.balanceOf(externalAccountAddress)).to.equal(4);
  });

  it("fails if exceed max supply", async () => {
    await expect(
      nft.connect(externalAccount).mint(seadrop.address, 20, externalAccountAddress, {
        value: mintPrice.mul(20).toString(),
      })
    ).to.be.revertedWith("Exceed Total Supply");
  });


  it("hardhat Should be able to use the multiConfigure method", async () => {
    const publicDrop: PublicDropStruct = {
      mintPrice: "100000000000000000", // 0.1 ether
      maxTotalMintableByWallet: 10,
      startTime: Math.round(Date.now() / 1000) - 100,
      endTime: Math.round(Date.now() / 1000) + 100,
      feeBps: 1000,
      restrictFeeRecipients: true,
    };

    const ownerAddress = await owner.getAddress();
    const allowListData = {
      merkleRoot: `0x${"3".repeat(64)}`,
      publicKeyURIs: [],
      allowListURI: "",
    };
    const tokenGatedDropStage = {
      mintPrice: "10000000000000000", // 0.01 ether
      maxTotalMintableByWallet: 10,
      startTime: Math.round(Date.now() / 1000) - 100,
      endTime: Math.round(Date.now() / 1000) + 500,
      dropStageIndex: 1,
      maxTokenSupplyForStage: 100,
      feeBps: 100,
      restrictFeeRecipients: true,
    };
    const signedMintValidationParams = {
      minMintPrice: 10,
      maxMaxTotalMintableByWallet: 5,
      minStartTime: 50,
      maxEndTime: 100,
      maxMaxTokenSupplyForStage: 100,
      minFeeBps: 5,
      maxFeeBps: 1000,
    };
    const config = {
      maxSupply: 100,
      baseURI: "https://example1.com",
      contractURI: "https://example2.com",
      seaDropImpl: seadrop.address,
      publicDrop,
      dropURI: "https://example3.com",
      allowListData,
      creatorPayoutAddress: ownerAddress,
      provenanceHash: `0x${"3".repeat(64)}`,
      allowedFeeRecipients: [ownerAddress],
      disallowedFeeRecipients: [],
      allowedPayers: [`0x${"4".repeat(40)}`, `0x${"5".repeat(40)}`],
      disallowedPayers: [],
      tokenGatedAllowedNftTokens: [
        `0x${"6".repeat(40)}`,
        `0x${"7".repeat(40)}`,
      ],
      tokenGatedDropStages: [
        tokenGatedDropStage,
        {
          ...tokenGatedDropStage,
          mintPrice: tokenGatedDropStage.mintPrice + "1",
        },
      ],
      disallowedTokenGatedAllowedNftTokens: [],
      signers: [`0x${"8".repeat(40)}`, `0x${"9".repeat(40)}`],
      signedMintValidationParams: [
        signedMintValidationParams,
        {
          ...signedMintValidationParams,
          minMintPrice: signedMintValidationParams.minMintPrice + 1,
        },
      ],
      disallowedSigners: [],
    };

    await expect(
      nft.connect(owner).multiConfigure(config)
    ).to.be.revertedWith("OnlyOwner()");

    // Should revert if tokenGatedAllowedNftToken.length != tokenGatedDropStages.length
    await expect(
      nft.connect(owner).multiConfigure({
        ...config,
        tokenGatedAllowedNftTokens: config.tokenGatedAllowedNftTokens.slice(1),
      })
    ).to.be.revertedWith("TokenGatedMismatch");

    // Should revert if signers.length != signedMintValidationParams.length
    await expect(
      nft.connect(owner).multiConfigure({
        ...config,
        signers: config.signers.slice(1),
      })
    ).to.be.revertedWith("SignersMismatch");

    await expect(nft.connect(owner).multiConfigure(config))
      .to.emit(seadrop, "DropURIUpdated")
      .withArgs(nft.address, "https://example3.com");

    const checkResults = async () => {
      expect(await nft.maxSupply()).to.eq(100);
      expect(await nft.baseURI()).to.eq("https://example1.com");
      expect(await nft.contractURI()).to.eq("https://example2.com");
      expect(await seadrop.getPublicDrop(nft.address)).to.deep.eq([
        ethers.BigNumber.from(publicDrop.mintPrice),
        publicDrop.startTime,
        publicDrop.endTime,
        publicDrop.maxTotalMintableByWallet,
        publicDrop.feeBps,
        publicDrop.restrictFeeRecipients,
      ]);
      expect(await seadrop.getAllowListMerkleRoot(nft.address)).to.eq(
        allowListData.merkleRoot
      );
      expect(await seadrop.getCreatorPayoutAddress(nft.address)).to.eq(
        ownerAddress
      );
      expect(await seadrop.getAllowedFeeRecipients(nft.address)).to.deep.eq([
        ownerAddress,
      ]);
      expect(await seadrop.getPayers(nft.address)).to.deep.eq(
        config.allowedPayers
      );
      expect(await nft.provenanceHash()).to.eq(`0x${"3".repeat(64)}`);
      expect(
        await seadrop.getTokenGatedAllowedTokens(nft.address)
      ).to.deep.eq(config.tokenGatedAllowedNftTokens);
      for (const [i, allowed] of config.tokenGatedAllowedNftTokens.entries()) {
        expect(
          await seadrop.getTokenGatedDrop(nft.address, allowed)
        ).to.deep.eq([
          ethers.BigNumber.from(config.tokenGatedDropStages[i].mintPrice),
          config.tokenGatedDropStages[i].maxTotalMintableByWallet,
          config.tokenGatedDropStages[i].startTime,
          config.tokenGatedDropStages[i].endTime,
          config.tokenGatedDropStages[i].dropStageIndex,
          config.tokenGatedDropStages[i].maxTokenSupplyForStage,
          config.tokenGatedDropStages[i].feeBps,
          config.tokenGatedDropStages[i].restrictFeeRecipients,
        ]);
      }
      expect(await seadrop.getSigners(nft.address)).to.deep.eq(
        config.signers
      );
      for (const [i, signer] of config.signers.entries()) {
        expect(
          await seadrop.getSignedMintValidationParams(nft.address, signer)
        ).to.deep.eq([
          ethers.BigNumber.from(
            config.signedMintValidationParams[i].minMintPrice
          ),
          config.signedMintValidationParams[i].maxMaxTotalMintableByWallet,
          config.signedMintValidationParams[i].minStartTime,
          config.signedMintValidationParams[i].maxEndTime,
          config.signedMintValidationParams[i].maxMaxTokenSupplyForStage,
          config.signedMintValidationParams[i].minFeeBps,
          config.signedMintValidationParams[i].maxFeeBps,
        ]);
      }
    };
    await checkResults();

    // Should not do anything if all fields are zeroed out
    const zeroedConfig = {
      maxSupply: 0,
      baseURI: "",
      contractURI: "",
      seaDropImpl: seadrop.address,
      publicDrop: {
        mintPrice: 0,
        maxTotalMintableByWallet: 0,
        startTime: 0,
        endTime: 0,
        feeBps: 0,
        restrictFeeRecipients: true,
      },
      dropURI: "",
      allowListData: {
        merkleRoot: ethers.constants.HashZero,
        publicKeyURIs: [],
        allowListURI: "",
      },
      creatorPayoutAddress: ethers.constants.AddressZero,
      provenanceHash: ethers.constants.HashZero,
      allowedFeeRecipients: [],
      disallowedFeeRecipients: [],
      allowedPayers: [],
      disallowedPayers: [],
      tokenGatedAllowedNftTokens: [],
      tokenGatedDropStages: [],
      disallowedTokenGatedAllowedNftTokens: [],
      signers: [],
      signedMintValidationParams: [],
      disallowedSigners: [],
    };
    await expect(nft.connect(owner).multiConfigure(zeroedConfig)).to.not.emit(
      seadrop,
      "DropURIUpdated"
    );
    await checkResults();

    // Should unset properties
    await expect(
      nft.connect(owner).multiConfigure({
        ...zeroedConfig,
        disallowedFeeRecipients: config.allowedFeeRecipients,
      })
    )
      .to.emit(seadrop, "AllowedFeeRecipientUpdated")
      .withArgs(nft.address, ownerAddress, false);
    await expect(
      nft.connect(owner).multiConfigure({
        ...zeroedConfig,
        disallowedPayers: config.allowedPayers,
      })
    )
      .to.emit(seadrop, "PayerUpdated")
      .withArgs(nft.address, config.allowedPayers[0], false);
    await expect(
      nft.connect(owner).multiConfigure({
        ...zeroedConfig,
        disallowedTokenGatedAllowedNftTokens: [
          config.tokenGatedAllowedNftTokens[0],
        ],
      })
    )
      .to.emit(seadrop, "TokenGatedDropStageUpdated")
      .withArgs(nft.address, config.tokenGatedAllowedNftTokens[0], [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        false,
      ]);
    await expect(
      nft.connect(owner).multiConfigure({
        ...zeroedConfig,
        disallowedSigners: [config.signers[0]],
      })
    )
      .to.emit(seadrop, "SignedMintValidationParamsUpdated")
      .withArgs(nft.address, config.signers[0], [0, 0, 0, 0, 0, 0, 0]);
  });
});
