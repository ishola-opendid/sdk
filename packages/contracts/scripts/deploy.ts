import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";
const deployStaker: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

const { deployer } = await hre.getNamedAccounts();
const { deploy, get } = hre.deployments;
const exampleExternalContract = await get("ExampleExternalContract");
const durationInSeconds = 300; // 5 minutes
const thresholdInWei = ethers.parseEther("1"); // 1 ETH

await deploy("OpenDID", {
  from: deployer,
  // Contract constructor arguments
  args: [exampleExternalContract.address, durationInSeconds, thresholdInWei],
  log: true,
  // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
  // automatically mining the contract deployment transaction. There is no effect on live networks.
  autoMine: true,
});

};
export default deployStaker;
deployStaker.tags = ["OpenDID"];