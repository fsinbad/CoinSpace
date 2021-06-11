import { toAtom, toUnitString } from 'lib/convert';
import { translate } from 'lib/i18n';
import _ from 'lodash';

export async function validateSend(options) {
  const amount = toAtom(options.amount);
  const { wallet } = options;
  const { to } = options;
  const fee = toAtom(options.fee);
  let tx = null;

  try {
    if (['bitcoin', 'bitcoincash', 'bitcoinsv', 'litecoin', 'dogecoin', 'dash'].indexOf(wallet.networkName) !== -1) {
      tx = wallet.createTx(to, amount, fee);
    } else if (wallet.networkName === 'ethereum') {
      tx = wallet.createTx(to, amount);
    } else if (wallet.networkName === 'ripple') {
      tx = await wallet.createTx(to, amount, options.tag, options.invoiceId);
    } else if (wallet.networkName === 'stellar') {
      tx = wallet.createTx(to, amount, options.memo, !options.destinationInfo.isActive);
    } else if (wallet.networkName === 'eos') {
      tx = wallet.createTx(to, amount, options.memo);
    } else if (wallet.networkName === 'monero') {
      tx = await wallet.createTx(to, amount, fee);
    }
    options.tx = tx;
  } catch (e) {
    if (/Invalid address/.test(e.message)) {
      throw new Error(translate('Please enter a valid address to send to'));
    } else if (/Invalid tag/.test(e.message)) {
      throw new Error(translate('Please enter a valid destination tag'));
    } else if (/Invalid invoiceID/.test(e.message)) {
      throw new Error(translate('Please enter a valid invoice ID'));
    } else if (/Invalid memo/.test(e.message)) {
      throw new Error(translate('Please enter a valid memo'));
    } else if (/Inactive account/.test(e.message)) {
      // eslint-disable-next-line max-len
      throw new Error(translate("Your wallet isn't activated. To activate it please send greater than minimum reserve (:minReserve :denomination) to your wallet address.", {
        minReserve: toUnitString(wallet.minReserve),
        denomination: wallet.denomination,
      }));
    } else if (/Destination address equal source address/.test(e.message)) {
      throw new Error(translate('Please enter an address other than your wallet address'));
    } else if (/Invalid value/.test(e.message)) {
      if (/Less than minimum reserve/.test(e.details)) {
        // eslint-disable-next-line max-len
        throw new Error(translate("Recipient's wallet isn't activated. You can send only amount greater than :minReserve :denomination.", {
          minReserve: toUnitString(wallet.minReserve),
          denomination: wallet.denomination,
        }));
      } else {
        throw new Error(translate('Please enter an amount above', {
          dust: `${toUnitString(e.dustThreshold)} ${wallet.denomination}`,
        }));
      }
    } else if (/Invalid gasLimit/.test(e.message)) {
      throw new Error(translate('Please enter Gas Limit greater than zero'));
    } else if (/Invalid fee/.test(e.message)) {
      // TODO add translation when inplemented in wallets
      throw new Error('Please enter valid fee');
    } else if (/Transaction too large/.test(e.message)) {
      throw new Error(translate('Transaction too large'));
    } else if (/Insufficient funds/.test(e.message)) {
      if (/Additional funds confirmation pending/.test(e.details)) {
        // eslint-disable-next-line max-len
        throw new Error(translate('Some funds are temporarily unavailable. To send this transaction, you will need to wait for your pending transactions to be confirmed first.'));
      } else if (/Attempt to empty wallet/.test(e.details) && wallet.networkName === 'ethereum') {
        // eslint-disable-next-line max-len
        const message = translate('It seems like you are trying to empty your wallet. Taking transaction fee into account, we estimated that the max amount you can send is. We have amended the value in the amount field for you', {
          sendableBalance: toUnitString(e.sendableBalance),
        });
        const error = new Error(message);
        error.sendableBalance = toUnitString(e.sendableBalance);
        throw error;
      } else if (/Attempt to empty wallet/.test(e.details) && wallet.networkName === 'eos') {
        // eslint-disable-next-line max-len
        const message = translate('It seems like you are trying to empty your wallet. Max amount you can send is. We have amended the value in the amount field for you', {
          sendableBalance: toUnitString(e.sendableBalance),
        });
        const error = new Error(message);
        error.sendableBalance = toUnitString(e.sendableBalance);
        throw error;
      // eslint-disable-next-line max-len
      } else if (/Attempt to empty wallet/.test(e.details) && (wallet.networkName === 'ripple' || wallet.networkName === 'stellar')) {
        // eslint-disable-next-line max-len
        const message = translate('It seems like you are trying to empty your wallet. Taking transaction fee and minimum reserve into account, we estimated that the max amount you can send is. We have amended the value in the amount field for you', {
          sendableBalance: toUnitString(e.sendableBalance),
          minReserve: toUnitString(wallet.minReserve),
          denomination: wallet.denomination,
        });
        const error = new Error(message);
        error.sendableBalance = toUnitString(e.sendableBalance);
        throw error;
      } else {
        throw new Error(translate('You do not have enough funds in your wallet (incl. fee)'));
      }
    } else if (/Insufficient ethereum funds for token transaction/.test(e.message)) {
      // eslint-disable-next-line max-len
      throw new Error(translate('You do not have enough Ethereum funds to pay transaction fee (:ethereumRequired ETH).', {
        ethereumRequired: toUnitString(e.ethereumRequired, 18),
      }));
    } else if (e.message === 'cs-node-error') {
      throw new Error(translate('Network node error. Please try again later.', {
        network: _.upperFirst(wallet.networkName),
      }));
    }

    throw e;
  }
}

export default validateSend;
