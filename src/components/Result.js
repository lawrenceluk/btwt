import React, { Component } from 'react';
import { string, object, array, bool, number } from 'prop-types'

class Result extends Component {
  static propTypes = {
    symbol: string,
    localCurrency: string,
    selectedCoin: object,
    matches: object,
    coins: array,
    currencyLogo: string,
    buyMode: bool,
    sellAmount: string,
    buyAmount: string,
    order: number
  }

  renderCoinImage() {
    if (this.props.symbol === this.props.localCurrency) {
      const currencyClass = 'fa fa-fw fa-' + this.props.currencyLogo;
      return (
        <div className='exchange-result-thumbnail'>
          <span className={currencyClass}></span>
        </div>
      );
    } else {
      const coin = this.props.coins.filter((c) => { return c.value === this.props.symbol; })[0];
      if (!coin) {
        return false;
      }
      const img = coin.image;
      const url = 'https://www.cryptocompare.com' + img;
      return (
        <img className='exchange-result-thumbnail' alt='coin-thumbnail' src={url} />
      );
    }
  }

  renderConversion() {
    const result = this.props.matches[this.props.symbol];
    const of = this.props.symbol === this.props.localCurrency ? '' : ' of ' + this.props.symbol;

    return this.props.buyMode ? (
      <div>
        {Number(this.props.buyAmount).toFixed(2).toLocaleString('currency', this.props.localCurrency)} {this.props.localCurrency} {of} would buy you
        <h3 className='exchange-result-title'>{result.buyingPower} {this.props.selectedCoin.value}</h3>
      </div>
    ) : (
      <div>
        {this.props.sellAmount} {this.props.selectedCoin.value} converted to {this.props.symbol} is worth
        <h3 className='exchange-result-title'>{Number(result.buyingPower).toFixed(2).toLocaleString('currency', this.props.localCurrency)} {this.props.localCurrency}</h3>
      </div>
    );
  }

  renderDetails() {
    const result = this.props.matches[this.props.symbol];
    const market = result.LASTMARKET || result.MARKET;

    return (
      <div className='exchange-result-description'>
        1 {this.props.selectedCoin.value} costs <strong>{result.priceFloat} {this.props.symbol}</strong>
        <small>(1 {this.props.symbol} = <strong>{(1/result.localRate).toFixed(2)} {this.props.localCurrency}</strong>)</small>
        <div className='exchange-result-stats'>
          <div className='row'>
            <div><div className='arrow-up'></div>24h High</div>
            <div><strong>{result.HIGH24HOUR}</strong></div>
          </div>
          <div className='row'>
            <div><div className='arrow-down'></div>24h Low</div>
            <div><strong>{result.LOW24HOUR}</strong></div>
          </div>
          <div className='exchange-result-details'>
            <div>Market: {market}</div>
            <small>Updated {(new Date(result.LASTUPDATE*1000)).toLocaleTimeString()}</small>
          </div>
        </div>
      </div>
    )
  }

  render() {
    const bestClassname = this.props.order === 0 ? 'exchange-result best' : 'exchange-result';
    return (
      <div className={bestClassname}>
        <div className='exchange-result-header'>
          {this.renderCoinImage()}
          {this.renderConversion()}
        </div>
        {this.renderDetails()}
      </div>
    );
  }
}

export default Result;
