import fs from "fs";
import { ethers, upgrades } from "hardhat";
import CollectionConfig from "../config/CollectionConfig";
import { seadropAddress, tokenSymbol } from "../config/constants";

async function mainDeploy() {
  const tokenName = CollectionConfig.contractName;
  const ERC721SeaDropUpgradeable = await ethers.getContractFactory(tokenName);

  console.log(`Deploying WTR seadrop contract with name: ${tokenName}`);
  const allowedSeaDrop = [seadropAddress]

  const token = await upgrades.deployProxy(
    ERC721SeaDropUpgradeable,
    [
      tokenName,
      tokenSymbol,
      allowedSeaDrop,
    ],
    { initializer: "initialize" }
  );

  await token.deployed();

  console.log(`setting baseURI to ${CollectionConfig.publicMetadataUri}`);
  await token.setBaseURI(CollectionConfig.publicMetadataUri);

  const addresses = {
    proxy: token.address,
    admin: await upgrades.erc1967.getAdminAddress(token.address),
    implementation: await upgrades.erc1967.getImplementationAddress(
      token.address
    ),
  };
  console.log("Addresses: ", addresses);

  try {
    await (run as any)("verify", { address: addresses.implementation });
  } catch (e) {}

  fs.writeFileSync("deployment-addresses.json", JSON.stringify(addresses));
}

mainDeploy().then(r => {});
