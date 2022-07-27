// Get token address on AVAX
// Used for some deployment
export const getTokenAddressOnAVAX = (name: string): string => {
  switch (name) {
    case "USDC.e":
      return "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";

    case "USDC":
      return "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";

    case "USDT.e":
      return "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";

    case "DEG":
      return "0x9f285507Ea5B4F33822CA7aBb5EC8953ce37A645";

    case "USDT":
      return "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";

    case "YUSD":
      return "0x111111111111ed1D73f860F57b2798b683f2d325";

    default:
      return "";
  }
};
