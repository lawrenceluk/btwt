import React, { Component } from 'react';
import './App.css';
import 'react-select/dist/react-select.css';
import Select from 'react-select/dist/react-select';
import { string, object, func, array, bool } from 'prop-types'

class Inputs extends Component {
  static propTypes = {
    coins: array,
    exchange: object,
    exchanges: object,
    exchangeTypes: string,
    sellAmount: string,
    selectedCoin: object,
    updateExchangeTypes: func,
    updateCoin: func,
    updateSellAmount: func,
    buyMode: bool,
    updateExchange: func
  }

  render() {
    const coinImage = {
      backgroundImage: "url('https://www.cryptocompare.com" + this.props.selectedCoin.image + "')"
    };
    const buy = this.props.buyMode ? 'buy' : 'sell';
    const sellAmount = this.props.buyMode ? false : (
      <input type='number' min='0' value={this.props.sellAmount} onChange={this.props.updateSellAmount} className='exchange-currency-amount' />
    );

    const exchangeNames = [{
      value: 'Any',
      label: 'Any'
    }].concat(Object.keys(this.props.exchanges).map((e) => {
      return {
        value: e,
        label: e
      };
    }));

    const exchangeDisclaimer = (this.props.exchange && this.props.exchange !== 'Any') ? (
      <div className='exchange-disclaimer'>
        DISCLAIMER: data is sourced from CryptoCompare and may be missing or inaccurate. Not all trading pairs
        are available, even if you see them on the exchange.
      </div>
    ) : false;

    return (
      <div className='exchange-input'>
        <div className='exchange-input-image' style={coinImage}></div>
        <div>I want to {buy} {sellAmount}
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
        {exchangeDisclaimer}
      </div>
    );
  }
}

export default Inputs;
