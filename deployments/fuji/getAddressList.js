const BuyerToken = require("./BuyerToken.json");
const CoreStakingPool = require("./CoreStakingPool.json");
const DegisLottery = require("./DegisLottery.json");
const DegisToken = require("./DegisToken.json");
const EmergencyPool = require("./EmergencyPool.json");
const FarmingPool = require("./FarmingPool.json");
const FDPolicyToken = require("./FDPolicyToken.json");
const InsurancePool = require("./InsurancePool.json");
const MockUSD = require("./MockUSD.json");
const NaughtyFactory = require("./NaughtyFactory.json");
const NaughtyRouter = require("./NaughtyRouter.json");
const PolicyCore = require("./PolicyCore.json");
const PolicyFlow = require("./PolicyFlow.json");
const PriceGetter = require("./PriceGetter.json");
const PurchaseIncentiveVault = require("./PurchaseIncentiveVault.json");
const RandomNumberGenerator = require("./RandomNumberGenerator.json");
const SigManager = require("./SigManager.json");
const StakingPoolFactory = require("./StakingPoolFactory.json");

const fs = require("fs");

function generateAddressList() {
  const addressList = JSON.parse(fs.readFileSync("address_fuji.json"));

  addressList.BuyerToken = BuyerToken.address;
  addressList.CoreStakingPool = CoreStakingPool.address;
  addressList.DegisLottery = DegisLottery.address;
  addressList.DegisToken = DegisToken.address;
  addressList.EmergencyPool = EmergencyPool.address;
  addressList.FarmingPool = FarmingPool.address;
  addressList.FDPolicyToken = FDPolicyToken.address;
  addressList.InsurancePool = InsurancePool.address;
  addressList.MockUSD = MockUSD.address;
  addressList.NaughtyFactory = NaughtyFactory.address;
  addressList.NaughtyRouter = NaughtyRouter.address;
  addressList.PolicyCore = PolicyCore.address;
  addressList.PolicyFlow = PolicyFlow.address;
  addressList.PriceGetter = PriceGetter.address;
  addressList.PurchaseIncentiveVault = PurchaseIncentiveVault.address;
  addressList.RandomNumberGenerator = RandomNumberGenerator.address;
  addressList.SigManager = SigManager.address;
  addressList.StakingPoolFactory = StakingPoolFactory.address;

  fs.writeFileSync(
    "address_fuji.json",
    JSON.stringify(addressList, null, "\t")
  );
}

generateAddressList();
