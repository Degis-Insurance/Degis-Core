import { stablecoinToWei, toWei } from "../../test/utils";

export const getFarmingSpeed = () => {
  const speed = [];

  speed[0] = [];
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
