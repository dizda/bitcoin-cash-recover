var BitcoreCash = require('bitcore-lib-cash');
var Insight      = require('bitcore-explorers').Insight;
var Networks = BitcoreCash.Networks;
var seed1 = '';
var seed2 = '';
var api_endpoints = [
  'https://blockdozer.com/insight-api/',
  'https://bccblock.info',
  'https://bch-bitcore2.trezor.io'
];
var wallet1 = createWallet(seed1);
var wallet2 = createWallet(seed2);
var fee = BitcoreCash.Unit.fromBTC(0.00100000).toSatoshis();

var insight = new Insight(api_endpoints[1], Networks.defaultNetwork);

insight.getUnspentUtxos('3HpyUDbizK5QFF7V6AULzaHqvgpz2J8Q5A', function(err, utxos) {
  console.error('error:', err);
  console.log('UTXOs:', utxos);
  console.log(utxos[0].satoshis);
  console.log(utxos[0].toJSON());
  createTransaction(utxos);
});


function createTransaction(utxos)
{
  var publicKeys = ["025ed3129b592ed0fda37808c9c9576670c7a6014bd141ea40987e2756c0b3e27e","029bdbc3ea4111530abc61b7e2ffc0c5b0b6dca64e0202c13ae8a1840b65afdb6e","02d2898b3a8d88d573fa4b7430da21eed8f1d660dc64083b14ba7e8f6ce2647d22"];
  var redeemScript = BitcoreCash.Script.buildMultisigOut(publicKeys, 2);
  var transaction = new BitcoreCash.Transaction();
  var address = new BitcoreCash.Address(redeemScript.toScriptHashOut(), Networks.defaultNetwork);
  console.log('Address:', address);
  console.log('redeemScript1:', new BitcoreCash.Script(address).toHex());
  console.log('redeemScript2:', redeemScript.toBuffer().toString('hex'));

  transaction.from(utxos, publicKeys, 2);
  // transaction.change("2N7nWWBC5fq9LUunmbKwStLs67VZYGt2J8v");
  // transaction.from({
  //     address: utxos[0].address,
  //     txid:    utxos[0].toJSON().txid,
  //     outputIndex: utxos[0].toJSON().vout,
  //     script: redeemScript.toScriptHashOut(),
  //     satoshis: utxos[0].satoshis
  // }, publicKeys, 2);
  // transaction.from({
  //     address: utxos[0].address,
  //     txid:    utxos[0].toJSON().txid,
  //     outputIndex: utxos[0].toJSON().vout,
  //     script: redeemScript.toScriptHashOut(),
  //     satoshis: utxos[0].satoshis
  // }, publicKeys, 2);
  /*transaction.from({
      address: address.toString(),
      txid:    utxos[0].toJSON().txid,
      outputIndex: utxos[0].toJSON().vout,
      script: new BitcoreCash.Script(address).toHex(),
      satoshis: utxos[0].satoshis
  }, publicKeys, 2);*/


  // Use this patch https://github.com/sfoxhq/bitcore-lib/commit/d87540ff9f9289d7157fbff4d1819c504999f83f
  // to fix "Address has mismatched network type."
  transaction.to('1LorqmGm3eb1yLoP1c9yHvY74n7jjjc1U9', utxos[0].satoshis - fee);
  transaction.fee(fee);
  transaction.sign([
    getPrivateKey(wallet1, 1, false, 1568),
    getPrivateKey(wallet2, 1, false, 1568)
  ]);

  console.log('Redeem Script:', redeemScript.toScriptHashOut().toBuffer().toString('hex'));
  console.log(transaction.toBuffer().toString('hex'));
  console.log(transaction.toJSON());
  console.log(transaction.serialize());

// insight.broadcast(transaction, function(err, returnedTxId) {
//
//   if (err) {
//     res.send(err)
//   } else {
//     res.json({ transaction_id: returnedTxId });
//   }
//
// });
}


/**
 * @param {Wallet}  wallet
 * @param {Number}  application Application id
 * @param {Boolean} isExternal
 * @param {Number}  address
 *
 * @returns {HDNode.privKey|*|.HDNode.privKey}
 */
function getPrivateKey(wallet, application, isExternal, address)
{
  var privateKey = wallet
    .derive(44, true) // BIP44 constant
    .derive(0, true)  // bitcoin
    .derive(application, true)  // # application
    .derive(isExternal ? 0 : 1)        // chain
    .derive(address)        // address
  ;

  return privateKey.privateKey;
}

function createWallet(seed)
{
  return BitcoreCash.HDPrivateKey.fromSeed(BitcoreCash.crypto.Hash.sha256(BitcoreCash.deps.Buffer(seed)).toString('hex'), Networks.defaultNetwork);
}