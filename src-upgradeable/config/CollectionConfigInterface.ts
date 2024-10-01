export default interface CollectionConfigInterface {
  contractName: string;
  tokenName: string;
  tokenSymbol: string;
  hiddenMetadataUri: string;
  publicMetadataUri: string;
  contractMetadataUri: string;
  dropUri: string;
  maxSupply: number;
  contractAddress: string|null;
  marketplaceIdentifier: string;
  whitelistAddresses: string[];
};
