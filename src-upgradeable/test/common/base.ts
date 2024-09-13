import { Contract, Signer } from "ethers";
import { ethers, upgrades } from "hardhat";
import CollectionConfig from "../../config/CollectionConfig";

export const tokenName = CollectionConfig.tokenName;
export const tokenSymbol = CollectionConfig.tokenSymbol;
export const seadropAddress = process.env.SEADROP_ADDRESS || "";

export const deployContract = async () => {
  const [owner, externalAccount, nonHolder]: Signer[] =
    await ethers.getSigners();
  const NFTFactory = await ethers.getContractFactory(tokenName);
  console.info(`NFTFactory for ${tokenName}`);
  const nft = await upgrades.deployProxy(
    NFTFactory,
    [
      tokenName,
      tokenSymbol,
      [seadropAddress]
    ],
    {
      initializer: "initialize"
    }
  );
  console.info(`deploying ${tokenName}`);
  await nft.deployed();
  console.warn(`deployed contract proxy to ${nft.address} symbol: ${await nft.symbol()} name: ${await nft.name()}`);
  const addresses = {
    proxy: nft.address,
    admin: await upgrades.erc1967.getAdminAddress(nft.address),
    implementation: await upgrades.erc1967.getImplementationAddress(
      nft.address
    )
  };

  let ownerAddress = await owner.getAddress();
  // console.info(`updateCreatorPayoutAddress to seadrop: ${seadropAddress} creator: ${ownerAddress}`);
  //
  // // This fails for some reason
  // // await nft.updateCreatorPayoutAddress(seadropAddress, owner.getAddress());
  // console.info("updated creator payout address");


  return {
    nft,
    owner,
    ownerAddress: ownerAddress,
    externalAccount,
    externalAccountAddress: await externalAccount.getAddress(),
    nonHolder,
    nonHolderAddress: await nonHolder.getAddress(),
    addresses
  };
};

async function  initUpgradableContract(contractAddress: string) {
  // const Contract = await ethers.getContractFactory(CollectionConfig.contractName);
  if (contractAddress == null) {
    console.error("no contract address configured. maybe contract not deployed?")
  }
  console.info(`initializing contract for address: ${contractAddress} name: ${CollectionConfig.contractName}`)
  return await ethers.getContractAt(CollectionConfig.contractName, contractAddress!);
}

export const instantiateContract = async () => {
  const [owner, externalAccount, nonHolder]: Signer[] =
    await ethers.getSigners();

  const nft = await initUpgradableContract(CollectionConfig.contractAddress!);
  console.info(`instantiated nft contract: ${await nft.name()}  ${await nft.symbol()}`);
  let ownerAddress = await owner.getAddress();
  //await nft.updateCreatorPayoutAddress(seadropAddress, owner.getAddress());
  return {
    nft,
    owner,
    ownerAddress: ownerAddress,
    externalAccount,
    nonHolder,
  };
};


export const getTokenUri = async (nft: Contract, owner: Signer, tokenId: number) => {
  const tokenUri = await nft
    .connect(owner)
    .tokenURI(tokenId);
  console.log(`tokenUri for ${tokenId} = ${tokenUri}`);
  return tokenUri;
}
