/**
 * Remember to use this function in the root path of your hardhat project
 */

import * as fs from "fs";

///
/// Deployed Contract Address Info Record
///
export const readAddressList = function () {
  // const filePath = __dirname + "/address.json"
  return JSON.parse(fs.readFileSync("info/address.json", "utf-8"));
};

export const storeAddressList = function (addressList: object) {
  fs.writeFileSync(
    "info/address.json",
    JSON.stringify(addressList, null, "\t")
  );
};

export const clearAddressList = function () {
  const emptyList = {};
  fs.writeFileSync("info/address.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// Naughty Price Pool Info Record
///
export const readNaughtyPoolList = function () {
  return JSON.parse(fs.readFileSync("info/NPPool.json", "utf-8"));
};

export const storeNaughtyPoolList = function (NPPoolList: object) {
  fs.writeFileSync("info/NPPool.json", JSON.stringify(NPPoolList, null, "\t"));
};

export const clearNaughtyPoolList = function () {
  const emptyList = {};
  fs.writeFileSync("info/NPPool.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// Proxy Admin Info Record
///
export const readProxyAdmin = function () {
  return JSON.parse(fs.readFileSync("info/proxyAdmin.json", "utf-8"));
};

export const storeProxyAdmin = function (proxyAdmin: object) {
  fs.writeFileSync(
    "info/proxyAdmin.json",
    JSON.stringify(proxyAdmin, null, "\t")
  );
};

export const clearProxyAdmin = function () {
  const emptyList = {};
  fs.writeFileSync(
    "info/proxyAdmin.json",
    JSON.stringify(emptyList, null, "\t")
  );
};

///
/// Naughty Price Token Info Record
///
export const readNaughtyTokenList = function () {
  return JSON.parse(fs.readFileSync("info/NPToken.json", "utf-8"));
};

export const storeNaughtyTokenList = function (tokenList: object) {
  fs.writeFileSync("info/NPToken.json", JSON.stringify(tokenList, null, "\t"));
};

export const clearNaughtyTokenList = function () {
  const emptyList = {};
  fs.writeFileSync("info/NPToken.json", JSON.stringify(emptyList, null, "\t"));
};

///
/// Farming Pool Info Record
///
export const readFarmingPoolList = function () {
  return JSON.parse(fs.readFileSync("info/FarmingPool.json", "utf-8"));
};

export const storeFarmingPoolList = function (farmingPoolList: object) {
  fs.writeFileSync(
    "info/FarmingPool.json",
    JSON.stringify(farmingPoolList, null, "\t")
  );
};

export const clearFarmingPoolList = function () {
  const emptyList = {};
  fs.writeFileSync(
    "info/FarmingPool.json",
    JSON.stringify(emptyList, null, "\t")
  );
};

///
/// Signer Info Record
///
export const readSignerList = function () {
  return JSON.parse(fs.readFileSync("info/Signers.json", "utf-8"));
};

export const storeSignerList = function (signerList: object) {
  fs.writeFileSync("info/Signers.json", JSON.stringify(signerList, null, "\t"));
};

export const clearSignerList = function () {
  const emptyList = {};
  fs.writeFileSync("info/Signers.json", JSON.stringify(emptyList, null, "\t"));
};

export const getLinkAddress = function (networkName: string) {
  const linkAddress = {
    avax: "0x5947BB275c521040051D82396192181b413227A3",
    fuji: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    localhost: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  };

  const obj = JSON.parse(JSON.stringify(linkAddress));

  return obj[networkName];
};

export const readILMList = function () {
  return JSON.parse(fs.readFileSync("info/ILM.json", "utf-8"));
};

export const storeILMList = function (ILMList: object) {
  fs.writeFileSync("info/ILM.json", JSON.stringify(ILMList, null, "\t"));
};
