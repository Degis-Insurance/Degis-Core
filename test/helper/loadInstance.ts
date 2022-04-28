import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";

export const getFactory = async (name: string): Promise<ContractFactory> => {
  return await ethers.getContractFactory(name);
};

export const getContract = async (
  name: string,
  params: []
): Promise<Contract> => {
  const factory = await getFactory(name);
  return await factory.deploy(params);
};
