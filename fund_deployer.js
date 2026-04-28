const viem = require('./backend/node_modules/viem/_cjs/index.js');
const accounts = require('./backend/node_modules/viem/_cjs/accounts/index.js');
const chains = require('./backend/node_modules/viem/_cjs/chains/index.js');

const { createWalletClient, createPublicClient, http, parseEther } = viem;
const { mnemonicToAccount } = accounts;
const { baseSepolia } = chains;

const mnemonic = 'soda spice define planet health potato coffee begin hair pact retreat ticket';
const orchestratorAccount = mnemonicToAccount(mnemonic, { path: "m/44'/60'/0'/0/0" });

const client = createWalletClient({ account: orchestratorAccount, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const DEPLOYER = '0x552d7190753F0c71799e8Cbb0413747cE48DAAe4';

async function main() {
  const orchBal = await publicClient.getBalance({ address: orchestratorAccount.address });
  const deployerBal = await publicClient.getBalance({ address: DEPLOYER });
  console.log('Orchestrator ETH:', (Number(orchBal) / 1e18).toFixed(10));
  console.log('Deployer ETH:    ', (Number(deployerBal) / 1e18).toFixed(10));

  // Send half of orchestrator balance minus gas reserve
  const gasReserve = BigInt(50000000000000); // 0.00005 ETH for orchestrator gas
  const available = orchBal - gasReserve;
  if (available <= 0n) {
    console.log('Orchestrator has no ETH to spare');
    return;
  }
  const sendAmount = available > parseEther('0.00002') ? parseEther('0.00002') : available;
  console.log('Sending', (Number(sendAmount) / 1e18).toFixed(10), 'ETH to deployer...');
  const hash = await client.sendTransaction({ to: DEPLOYER, value: sendAmount });
  console.log('TX:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed block', receipt.blockNumber.toString());
  const newBal = await publicClient.getBalance({ address: DEPLOYER });
  console.log('Deployer ETH now:', (Number(newBal) / 1e18).toFixed(10));
}
main().catch(e => { console.error('Error:', e.shortMessage || e.message); process.exit(1); });
