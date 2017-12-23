var BitcoreCash = require('bitcore-lib-cash');
var Insight      = require('bitcore-explorers').Insight;
var Networks = BitcoreCash.Networks;
var seed1 = '';
var seed2 = '';
var mysql       = require('mysql');
var connection  = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : ''
});
var api_endpoints = [
  'https://blockdozer.com/insight-api/',
  'https://bccblock.info',
  'https://bch-bitcore2.trezor.io'
];
var wallet1 = createWallet(seed1);
var wallet2 = createWallet(seed2);
var fee = BitcoreCash.Unit.fromBTC(0.00100000).toSatoshis();
var insight = new Insight(api_endpoints[1], Networks.defaultNetwork);
var transaction = new BitcoreCash.Transaction();


connection.connect();

connection.query(`
SELECT *
FROM address
WHERE bcc_amount > 0
AND application_id = 1
ORDER BY id ASC`, function (error, results, fields) {

  if (error) throw error;

  let requests = results.reduce((promiseChain, item) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getUnspentTxs(item, resolve);
    }));
  }, Promise.resolve());

  requests.then(() => {
    // Use this patch https://github.com/sfoxhq/bitcore-lib/commit/d87540ff9f9289d7157fbff4d1819c504999f83f
    // to fix "Address has mismatched network type."
    transaction.to('1DNpVDDhPbMSSwDhcbEAMXDWryyX4yACRz', 51424264);
    transaction.fee(fee);

    let requests2 = results.reduce((promiseChain, item) => {
      return promiseChain.then(() => new Promise((resolve) => {
        // Order matters! Signing process should be right after those 3 steps {addinputs,to,fee}, @see https://github.com/bitpay/bitcore-lib/issues/162#issuecomment-353710299
        transaction.sign([
          getPrivateKey(wallet1, 1, item.is_external, item.derivation),
          getPrivateKey(wallet2, 1, item.is_external, item.derivation)
        ]);
        resolve();
      }));
    }, Promise.resolve());

    requests2.then(() => {
      console.log(transaction._getInputAmount());
      console.log(transaction._getOutputAmount());
      console.log(transaction.getFee());
      console.log(transaction.serialize());
    });
  });

});

function getUnspentTxs(item, cb)
{
  insight.getUnspentUtxos(item.value, function(err, utxos) {
    console.log('#'+item.id+' '+item.value+' '+utxos.length);
    if (err) {

    }

    // console.log('UTXOs:', utxos);

    if (utxos.length) {

      addInput(utxos, item);

    } else {
      console.error('no utxos');
    }

    cb();
  });
}


function addInput(utxos, item)
{
  transaction.from(utxos, JSON.parse(item.pub_keys), 2);
}

// insight.broadcast(transaction, function(err, returnedTxId) {
//
//   if (err) {
//     res.send(err)
//   } else {
//     res.json({ transaction_id: returnedTxId });
//   }
//
// });

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