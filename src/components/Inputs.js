import React, { Component } from 'react';
import Select from 'react-select/dist/react-select';
import { string, object, func, array, bool } from 'prop-types'

class Inputs extends Component {
  static propTypes = {
    coins: array,
    exchange: string,
    exchanges: object,
    exchangeTypes: string,
    sellAmount: string,
    selectedCoin: object,
    updateExchangeTypes: func,
    updateCoin: func,
    updateSellAmount: func,
    buyMode: bool,
    updateExchange: func,
    availablePairs: array
  }

  render() {
    const coinImage = {
      backgroundImage: "url('https://www.cryptocompare.com" + this.props.selectedCoin.image + "')"
    };
    const buy = this.props.buyMode ? 'buy' : 'sell';
    const amountInput = this.props.buyMode ?
      <input type='number' min='0' value={this.props.buyAmount} onChange={this.props.updateBuyAmount} className='exchange-currency-amount' />
     : (
      <input type='number' min='0' value={this.props.sellAmount} onChange={this.props.updateSellAmount} className='exchange-currency-amount' />
    );
    const of = this.props.buyMode ? (<span>{this.props.localCurrency} worth of</span>) : false;

    let exchangeNames = Object.keys(this.props.exchanges).map((e) => {
      return {
        value: e,
        label: e
      };
    });
    exchangeNames.sort(function (a, b) {
      return a.label.localeCompare(b.label);
    })
    exchangeNames = [{
      value: 'Any',
      label: 'Any'
    }].concat(exchangeNames);

    const exchangeDisclaimer = (this.props.exchange && this.props.exchange !== 'Any') ? (
      <div className='exchange-disclaimer'>
        DISCLAIMER: data is sourced from CryptoCompare and may be missing or inaccurate. Not all trading pairs
        are available here, even if you see them on the exchange.
      </div>
    ) : <div className='exchange-disclaimer'>
        DISCLAIMER: direct trading pairs may not be available as shown. Data from certain exchanges may be missing.
      </div>;

    let exchangePairs = false;
    if (this.props.exchange && this.props.exchange !== 'Any' && this.props.availablePairs) {
      const pairs = this.props.availablePairs.map((p) => {
        return this.props.selectedCoin.value + '/' + p;
      }).join(', ');
      exchangePairs = (
        <div className='exchange-pairs'>
          {this.props.exchange} pairs: <strong>{pairs}</strong>
        </div>
      );
    }

    return (
      <div className='exchange-input'>
        <div className='exchange-input-image' style={coinImage}></div>
        <div>I want to {buy} {amountInput} {of}
          <Select
            className='exchange-currency-types'
            options={this.props.coins}
            value={this.props.selectedCoin}
            onChange={this.props.updateCoin}
            clearable={false}
          />
        </div>
        <br/>
        <div>I want to compare prices across
          <Select
            className='exchange-currency-types'
            options={this.props.coins}
            multi={true}
            value={this.props.exchangeTypes}
            simpleValue={true}
            onChange={this.props.updateExchangeTypes}
            clearable={false}
          />
        </div>
        <br/>
        <div>on the exchange:
          <Select
            className='exchange-currency-types'
            options={exchangeNames}
            value={this.props.exchange}
            onChange={this.props.updateExchange}
            clearable={false}
          />
        </div>
        {exchangePairs}
        {exchangeDisclaimer}
      </div>
    );
  }
}

export default Inputs;
