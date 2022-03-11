// Get token address on AVAX
// Used for some deployment
export const getTokenAddressOnAVAX = (name: string): string => {
  switch (name) {
    case "USDC.e":
      return "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";

    case "USDT.e":
      return "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";

    case "DEG":
      return "0x9f285507Ea5B4F33822CA7aBb5EC8953ce37A645";

    default:
      return "";
  }
};
