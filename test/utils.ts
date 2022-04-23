import { BigNumber } from "ethers";

export const toWei = (etherAmount: string) => {
  return ethers.utils.parseUnits(etherAmount);
};

export const formatTokenAmount = (amount: string) => {
  return ethers.utils.formatUnits(amount, 18);
};

export const stablecoinToWei = (stablecoinAmount: string | BigNumber) => {
  return ethers.utils.parseUnits(stablecoinAmount, 6);
};

export const formatStablecoin = (stablecoinAmount: string | BigNumber) => {
  return ethers.utils.formatUnits(stablecoinAmount, 6);
};

export const zeroAddress = () => {
  return ethers.constants.AddressZero;
};

export const getLatestBlockNumber = async (provider: any) => {
  const blockNumber = await provider.getBlockNumber();
  return blockNumber;
};

export const getLatestBlockTimestamp = async (provider: any) => {
  const blockNumBefore = await provider.getBlockNumber();
  const blockBefore = await provider.getBlock(blockNumBefore);
  return blockBefore.timestamp;
};

export const mineBlocks = async (blockNumber: number) => {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
};

// Get the current timestamp in seconds
export const getNow = () => {
  const time = new Date().getTime();
  const now = Math.floor(time / 1000);
  return now;
};

export const toBN = (normalNumber: number) => {
  return ethers.BigNumber.from(normalNumber);
};

export const customErrorMsg = (msg: string) => {
  return "custom error " + msg;
};
