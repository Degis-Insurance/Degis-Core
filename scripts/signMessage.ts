import {
  arrayify,
  keccak256,
  parseUnits,
  solidityKeccak256,
  toUtf8Bytes,
} from "ethers/lib/utils";
import { getNow } from "../test/utils";
import { ethers } from "hardhat";

export const signNewApplication = async (
  user: string,
  flightNumber: string,
  premium: number
): Promise<string> => {
  const dev_account = (await ethers.getSigners())[0];

  const _SUBMIT_CLAIM_TYPEHASH = keccak256(
    toUtf8Bytes("5G is great, physical lab is difficult to find")
  );

  const hashedFlightNumber = keccak256(toUtf8Bytes(flightNumber));

  const premium_format = parseUnits(premium.toString());

  const deadline = getNow() + 300;

  const hasedInfo = solidityKeccak256(
    ["bytes", "bytes", "address", "uint256", "uint256"],
    [_SUBMIT_CLAIM_TYPEHASH, hashedFlightNumber, user, premium_format, deadline]
  );

  console.log("hashed info:", hasedInfo);

  const signature = await dev_account.signMessage(arrayify(hasedInfo));

  console.log("signature", signature);

  return signature;
};
