import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils';
import { MachineContractClient, MachineContractFactory } from '../clients/client';
import algosdk, { OnApplicationComplete } from 'algosdk';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';

describe('MachineContract Deployment', () => {
  let algorand: AlgorandClient;
  let deployer: algosdk.Account;

  beforeAll(async () => {
    // Set up Algorand client for testnet
    const secretKey = Buffer.from("H74d2kNSqOuxd36+OA03Gy9PLlQ2au6pzlzy9Are1742o/gKgRhqmEePN26LFuAfd2wbXOjFuxtFBSNTHE4lRA==", 'base64')
  const mnemonics  = algosdk.secretKeyToMnemonic(secretKey)
  const deployers  = algosdk.mnemonicToSecretKey(mnemonics)
console.log(mnemonics)
    algorand = AlgorandClient.testNet();

    // Create account from mnemonic
    const mnemonic = "announce feed swing base certain rib rose phrase crouch rotate voyage enroll same sort flush emotion pulp airport notice inject pelican zero blossom about honey";
    deployer = algosdk.mnemonicToSecretKey(mnemonic);

    // Fund account if needed (testnet)
    try {
      const accountInfo = await algorand.account.getInformation(deployer.addr);
      if (accountInfo.balance.microAlgo < 1000000) { // Less than 1 ALGO
        console.log('Account needs funding on testnet');
      }
    } catch (error) {
      console.log('Account not found, may need funding');
    }
  });

  it('should deploy the MachineContract', async () => {
    // Create the typed app factory
    const signer = algosdk.makeBasicAccountTransactionSigner(deployer)

    const appFactory = new MachineContractFactory({
      defaultSender: deployer.addr,
      defaultSigner: signer,
      algorand,
    })

    
    // Deploy the contract with required parameters
    const { appClient } = await appFactory.send.create.createApplication({
      args: {
        ownerAddress: deployer.addr.toString(),
        fixedPricing: AlgoAmount.MicroAlgos(1).microAlgo, // 1 ALGO in microAlgos
      },
      sender: deployer.addr,
      signer: signer,
      onComplete: OnApplicationComplete.NoOpOC,

    });

    // Verify deployment
    expect(appClient.appId).toBeDefined();
    expect(appClient.appId).toBeGreaterThan(0);
    console.log('Deployed MachineContract App ID:', appClient.appId);
  });




  it('should interact with deployed contract', async () => {
    // Deploy first

    const signer = algosdk.makeBasicAccountTransactionSigner(deployer)

    const client = algorand.client.getTypedAppClientById(MachineContractClient, {
      appId: BigInt(748111127),
      defaultSigner: signer,
      defaultSender: deployer.addr,
    });

    const appAddress = algosdk.getApplicationAddress(BigInt(748111127)); // Replace with your app ID

    const paymentTxn = await algorand.createTransaction.payment({
      sender: deployer.addr,
      receiver: appAddress, // Replace with the intended receiver
      amount: (3).algo(),           // 0.75 ALGO
    });
    
    // Step 2: Call the ABI method, passing the payment transaction as the argument
    const result = await client.send.pay({
      args: [paymentTxn], // Pass the payment transaction as the argument
      sender: deployer.addr,
      signer: signer
    });
    // Test price change
    const txnId = result.txIds[0]; // The first transaction ID in the group


    
    expect(txnId).toBeDefined();
  });
});