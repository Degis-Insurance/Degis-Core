export const toWei = (etherAmount: number) => {
  return ethers.utils.parseUnits(etherAmount.toString());
};

export const getAddressZero = () => {
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

export const getNow = () => {
  const time = new Date().getTime();
  const now = Math.floor(time / 1000);
  return now;
};
