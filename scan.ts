var mysql       = require('mysql');
var BitcoreCash = require('bitcore-lib-cash');
var Insight     = require('bitcore-explorers').Insight;
var Networks    = BitcoreCash.Networks;
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
var insight = new Insight(api_endpoints[1], Networks.defaultNetwork);




connection.connect();

connection.query(`
SELECT *
FROM address
WHERE is_bcc_checked is null
ORDER BY id ASC
LIMIT 10000`, function (error, results, fields) {

  if (error) throw error;

  let requests = results.reduce((promiseChain, item) => {
    return promiseChain.then(() => new Promise((resolve) => {
      getUnspentTxs(item, resolve);
    }));
  }, Promise.resolve());

});


function getUnspentTxs(item, cb)
{
  insight.getUnspentUtxos(item.value, function(err, utxos) {
    console.log('#'+item.id+' '+item.value);

    if (err) {

    }

    console.log('UTXOs:', utxos);

    if (utxos.length) {
      let amount = 0;

      utxos.forEach(function(utxo) {
        amount += utxo.toJSON().amount;
      });

      connection.query('UPDATE address SET is_bcc_checked = 1, bcc_amount = ? WHERE id = ? LIMIT 1', [amount, item.id]);
    } else {
      connection.query('UPDATE address SET is_bcc_checked = 1, bcc_amount = 0 WHERE id = ? LIMIT 1', [item.id]);
    }

    cb();
  });
}