import { stablecoinToWei, toWei } from "../../test/utils";

export const getFarmingSpeed = () => {
  const speed = [];
};

// Farming Pool Upgradeable
// Address: 0x69F8F0E775CFf1C361644c8fBd3bba8e9873B4cD

// Pool Id 1
// Token: AVAX_77.0_L_0605
// Address: 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690

const threshold_1: string[] = [
  stablecoinToWei("0"),
  stablecoinToWei("150000"),
  stablecoinToWei("300000"),
  stablecoinToWei("450000"),
  stablecoinToWei("600000"),
];

const reward_1_basic: string[] = [
  toWei("0.035"),
  toWei("0.07"),
  toWei("0.104"),
  toWei("0.139"),
  toWei("0.174"),
];

// 15 + 5
// Last 5 days 1.2x speed
const reward_1_speed: string[] = [
  toWei("0.042"),
  toWei("0.084"),
  toWei("0.1248"),
  toWei("0.1668"),
  toWei("0.2088"),
];

// Pool Id 2
// Token: AVAX_58.0_L_1705
// Address: 0x3679B24C909dfeDB89e6C171eCF0a6f5715320C3

// Pool Id 3
// Token: AVAX_33.0_L_0106
// Address: 0xa70639b76aBFdCA9C08c59Fb964aA241addA5B69
const threshold_2 = [
  stablecoinToWei("0"),
  stablecoinToWei("150000"),
  stablecoinToWei("300000"),
  stablecoinToWei("450000"),
  stablecoinToWei("600000"),
  stablecoinToWei("750000"),
];

const reward_2_basic: string[] = [
  toWei("0.03472"),
  toWei("0.06944"),
  toWei("0.08101"),
  toWei("0.09259"),
  toWei("0.10417"),
  toWei("0.11574"),
];

// Pool Id 4
// Initial Matching Farming Pool (1.2x speed)
// Token: IM_AVAX_27.0_L_1606
// Address: 0xdcc9c01261D4F432059140409aC13941e61F2b51
const threshold_3 = [
  stablecoinToWei("0"),
  stablecoinToWei("150000"),
  stablecoinToWei("300000"),
  stablecoinToWei("450000"),
  stablecoinToWei("600000"),
  stablecoinToWei("750000"),
];

const reward_3_basic: string[] = [
  toWei("0.04166"),
  toWei("0.08333"),
  toWei("0.09722"),
  toWei("0.11111"),
  toWei("0.125"),
  toWei("0.13888"),
];

// bonus 1200 deg / day
const bonus = toWei("0.01388");

// Pool Id 5
// Token: AVAX_27.0_L_1606
// Address:
const threshold_4 = [
  stablecoinToWei("0"),
  stablecoinToWei("150000"),
  stablecoinToWei("300000"),
  stablecoinToWei("450000"),
  stablecoinToWei("600000"),
  stablecoinToWei("750000"),
];

const reward_4_basic: string[] = [
  toWei("0.03472"),
  toWei("0.06944"),
  toWei("0.08101"),
  toWei("0.09259"),
  toWei("0.10417"),
  toWei("0.11574"),
];
// bonus 1000 deg / day
const bonus_4 = toWei("0.01157");

// Pool Id 6
// Token: IM_AVAX_15.0_L_0107
// Address: 0x6B657FB68907f0005931AA4088086a73Af4F0a40

const basic_6 = toWei("0.03472"); // 3000 deg / day
const bonus_6 = toWei("0.00694"); // 600 deg / day

// Pool Id 7
// Token: AVAX_15.0_L_0107
// Address: 0x50064925F17FEC98A0DE254bAD226AEf01a72744

const basic_7 = toWei("0.02893"); // 2500 deg / day
const bonus_7 = toWei("0.00578"); // 500 deg / day

// Pool Id 8
// Token: IM_XAVA_0.62_L_1307
// Address: 0xEa0C4b6307194EC20F2dB48e290A7e6dc148c31f

const basic_8 = toWei("0.02315"); // 2000 deg / day
const bonus_8 = toWei("0.00463"); // 400 deg / day

// Pool Id 9
// Token: XAVA_0.62_L_1307
// Address:
