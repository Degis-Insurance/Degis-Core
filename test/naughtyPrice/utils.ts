import { BigNumber } from "ethers";

export const getAmountOut = (
  amountIn: BigNumber,
  reserve0: BigNumber,
  reserve1: BigNumber,
  fee: number
) => {
  const amountInWithFee = amountIn.mul(1000 - fee);

  const denominator = reserve0.mul(10000);
  const numerator = amountInWithFee.mul(reserve1);

  const amountOut = numerator.div(denominator.add(amountInWithFee));

  return amountOut;
};
