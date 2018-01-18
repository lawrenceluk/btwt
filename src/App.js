/* global ga */
import './App.css';
import axios from 'axios';
import coins from './coinlist.json';
import exchanges from './exchanges.json'
import Inputs from './Inputs.js';
import Select from 'react-select';
import React, { Component } from 'react';

// in src
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X GET https://www.cryptocompare.com/api/data/coinlist/ > coinlist.json
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X GET https://min-api.cryptocompare.com/data/all/exchanges > exchanges.json

class App extends Component {
  constructor(props) {
    super(props);
    // fill for unsupported browsers
    Object.values = (obj) => Object.keys(obj).map(key => obj[key]);

    const canStore = typeof(Storage) !== 'undefined';
    let savedCoin = canStore && localStorage.getItem('buyCoin') ? localStorage.getItem('buyCoin') : '';
    const savedExchange = canStore && localStorage.getItem('exchange') ? localStorage.getItem('exchange') : 'Any';
    const savedCurrency = canStore && localStorage.getItem('currency') ? localStorage.getItem('currency') : 'USD';
    const savedSellAmount = canStore && localStorage.getItem('sellAmount') ? localStorage.getItem('sellAmount') : '100';
    const compareCoins = canStore && localStorage.getItem('buyCompareCoins') ?
     (localStorage.getItem('buyCompareCoins') || 'BTC,ETH') : 'BTC,ETH';
    const coinList = Object.values(coins.Data).map(function (c) {
      return {
        value: c.Name,
        label: c.CoinName,
        order: parseInt(c.SortOrder, 10),
        image: c.ImageUrl
      };
    }).sort(function (a, b) { return a.order - b.order; });

    if (savedCoin) {
      const matchingCoin = coinList.filter((c) => { return c.value === savedCoin; })
      savedCoin = (matchingCoin.length) ? matchingCoin[0] : false;
    }

    this.state = {
      coins: coinList,
      exchange: savedExchange,
      selectedCoin: savedCoin || coinList[0],
      buyMode: window.location.hash !== '#sell',
      exchangeTypes: compareCoins,
      localCurrency: savedCurrency,
      sellAmount: savedSellAmount,
      coinResponse: {},
      currencyResponse: {},
      exchanges: exchanges,
      error: false
    };
    document.title =  window.location.hash !== '#sell' ? 'Buy This With That' : 'Sell This For That';
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.updateMode.bind(this, null), false);
    this.refresh();
  }

  updateMode() {
    this.setState({
      buyMode: window.location.hash !== '#sell'
    }, () => {
      document.title = this.state.buyMode ? 'Buy this, with that' : 'Sell this, for that';
      this.refresh();
    });
  }

  updateSellAmount(e) {
    if (parseFloat(e.target.value) < 0) { return; }
    // update store
    localStorage.setItem('sellAmount', e.target.value);
    // update state
    this.setState({
      sellAmount: e.target.value
    }, () => { this.recalculate(); });
  }

  updateCoin(val) {
    if (!val) { return; }
    // update store
    localStorage.setItem('buyCoin', val.value);
    // update state
    this.setState({
      selectedCoin: val
    }, this.refresh.bind(this));
  }

  updateExchange(val) {
    val = (val && val.value) ? val.value : 'Any';
    // update store
    localStorage.setItem('exchange', val);
    // update state
    this.setState({
      exchange: val
    }, this.refresh.bind(this));
  }

  updateExchangeTypes(val) {
    if (!val) { return; }
    // update store
    localStorage.setItem('buyCompareCoins', val);
    // update state
    this.setState({
      exchangeTypes: val
    }, this.refresh.bind(this));
  }

  updateCurrency(val) {
    if (!val) { return; }
    if (val === this.state.localCurrency) { return; }
    // update store
    localStorage.setItem('currency', val.value);
    // update state
    this.setState({
      localCurrency: val.value
    }, this.refresh.bind(this));
  }

  recalculate() {
    const selectedCoin = this.state.selectedCoin;
    const localCurrency = this.state.localCurrency;

    const matches = this.state.coinResponse.DISPLAY[selectedCoin.value];

    // transform price into something parsable
    Object.values(matches).forEach((data) => {
      data.priceFloat = parseFloat(data.PRICE.replace(/[^\d.-]/g, ''));
    });
    if (matches[localCurrency]) {
      if (this.state.buyMode) {
        matches[localCurrency].buyingPower = (1000 / matches[localCurrency].priceFloat).toFixed(6);
      } else {
        matches[localCurrency].buyingPower = (matches[localCurrency].priceFloat).toFixed(6) * (parseFloat(this.state.sellAmount) || 1);
      }
      matches[localCurrency].localRate = 1;
      matches[localCurrency].symbol = localCurrency;
    }

    // buying power: how much can 1000 usd buy
    var conversions = this.state.currencyResponse[localCurrency];
    Object.keys(conversions).forEach((sym) => {
      if (this.state.buyMode) {
        matches[sym].buyingPower = ((conversions[sym]*1000) / matches[sym].priceFloat).toFixed(6);
      } else {
        matches[sym].buyingPower = ((1 / conversions[sym]) * matches[sym].priceFloat).toFixed(6) * (parseFloat(this.state.sellAmount) || 1);
      }
      matches[sym].localRate = conversions[sym];
      matches[sym].symbol = sym;
    });

    // get best buying power
    var best = Object.values(matches).sort((a, b) => { return parseFloat(b.buyingPower) - parseFloat(a.buyingPower); })[0];
    matches[best.symbol].best = true;

    this.setState({
      loading: false,
      matches: matches
    })
  }

  refresh() {
    this.setState({
      loading: true
    })
    const selectedCoin = this.state.selectedCoin;
    const localCurrency = this.state.localCurrency;
    const exchange = (this.state.exchange && this.state.exchange !== 'Any') ? ('&e=' + this.state.exchange) : '';
    let convertTo = (this.state.localCurrency + ',' + this.state.exchangeTypes).split(',');

    if (this.state.exchange && this.state.exchange !== 'Any') {
      const availablePairs = this.state.exchanges[this.state.exchange] || {};
      if (selectedCoin.value in availablePairs) {
        convertTo = convertTo.filter(function (val) {
          return availablePairs[selectedCoin.value].indexOf(val) > -1;
        });
      }
    }

    if (convertTo.length === 0) {
      this.setState({
        error: true,
        loading: false
      });
      return;
    }

    axios.get('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=' + selectedCoin.value + '&tsyms=' + convertTo.join(',') + exchange)
    .then((res) => {
      if (res.data.Response && res.data.Response === 'Error') {
        this.setState({
          loading: false,
          error: true
        });
        return;
      }

      const matches = res.data.DISPLAY[selectedCoin.value];

      axios.get('https://min-api.cryptocompare.com/data/pricemulti?fsyms=' + localCurrency + '&tsyms=' + Object.keys(matches).join(','))
      .then((res2) => {
        if (res2.Response && res2.Response === 'Error') {
          return;
        }

        ga('send', {
          hitType: 'event',
          eventCategory: this.state.buyMode ? 'Buy' : 'Sell',
          eventAction: selectedCoin.value,
          eventLabel: convertTo
        });

        this.setState({
          error: false,
          loading: false,
          coinResponse: res.data,
          currencyResponse: res2.data
        }, this.recalculate.bind(this));
      })
      .catch(function (error) {
        console.warn(error);
      });
    })
    .catch(function (error) {
      console.warn(error);
    });
  }

  renderLoading() {
    return (
      <div id='loading-content'>
        <div className='loading-wave-container'>
          <div className='waves'>
            <div className='wave-0'><div className='wave-face'></div></div>
            <div className='wave-1'><div className='wave-face'></div></div>
            <div className='wave-2'><div className='wave-face'></div></div>
            <div className='wave-3'><div className='wave-face'></div></div>
            <div className='wave-4'><div className='wave-face'></div></div>
            <div className='wave-5'><div className='wave-face'></div></div>
            <div className='wave-6'><div className='wave-face'></div></div>
            <div className='wave-7'><div className='wave-face'></div></div>
          </div>
        </div>
      </div>
    );
  }

  renderModeSwitcher() {
    const button = this.state.buyMode ? (
      <a href='#sell'><button>Sell this, for that</button></a>
    ) : (
      <a href='#buy'><button>Buy this, with that</button></a>
    );
    return (
      <div className='exchange-mode-switch'>
        {button}
      </div>
    );
  }

  renderResults() {
    if (!this.state.coins) {
      return this.renderLoading();
    }
    if (this.state.error) {
      if (this.state.exchange && this.state.exchange !== 'Any') {
        return (
          <div className='exchange-result-error'>
            {this.state.exchange} does not have trading pairs for {this.state.selectedCoin.label}.
          </div>
        );
      } else if (!this.state.loading) {
        return (
          <div className='exchange-result-error'>
            Error retrieving results.
          </div>
        );
      }
    }

    const matches = this.state.matches;
    if (!matches || Object.keys(matches).length === 0) { return false; }

    const results = Object.keys(matches).map((sym, i) => {
      const of = sym === this.state.localCurrency ? '' : ' of ' + sym;
      const best = matches[sym].best ? 'exchange-result best' : 'exchange-result';
      const market = matches[sym].LASTMARKET || matches[sym].MARKET;

      let coinImage;
      if (sym !== this.state.localCurrency) {
        const coin = this.state.coins.filter(function (c) { return c.value === sym; })[0];
        if (!coin) {
          return false;
        }
        const img = coin.image;
        const url = 'https://www.cryptocompare.com' + img;
        coinImage = (<img className='exchange-result-thumbnail' alt='coin-thumbnail' src={url} />);
      } else {
        const currencyClass = 'fa fa-fw fa-' + this.state.localCurrency.toLowerCase();
        coinImage = (
          <div className='exchange-result-thumbnail'>
            <span className={currencyClass}></span>
          </div>
        );
      }

      const conversionValue = this.state.buyMode ? (
        <div>
          1000 {this.state.localCurrency} {of} would buy you
          <h3 className='exchange-result-title'>{matches[sym].buyingPower} {this.state.selectedCoin.value}</h3>
        </div>
      ) : (
        <div>
          {this.state.sellAmount} {this.state.selectedCoin.value} converted to {sym} is worth
          <h3 className='exchange-result-title'>{parseFloat(matches[sym].buyingPower).toFixed(4)} {this.state.localCurrency}</h3>
        </div>
      );

      return (
        <div className={best} key={i}>
          <div className='exchange-result-header'>
            {coinImage}
            {conversionValue}
            1 {this.state.selectedCoin.value} costs <strong>{matches[sym].priceFloat} {sym}</strong>
            <small>(1 {sym} = <strong>{(1/matches[sym].localRate).toFixed(6)} {this.state.localCurrency}</strong>)</small>
            <div className='exchange-result-stats'>
              <div className='row'>
                <div><div className='arrow-up'></div>24h High</div>
                <div><strong>{matches[sym].HIGH24HOUR}</strong></div>
              </div>
              <div className='row'>
                <div><div className='arrow-down'></div>24h Low</div>
                <div><strong>{matches[sym].LOW24HOUR}</strong></div>
              </div>
              <div className='exchange-result-details'>
                <div>Market: {market}</div>
                <small>Updated {matches[sym].LASTUPDATE.toLowerCase()}</small>
              </div>
            </div>
          </div>
        </div>
      );
    });

    return (
      <div className='exchange-output'>
        {results}
      </div>
    );
  }

  render() {
    const title = this.state.buyMode ? 'Buy This, With That' : 'Sell This, For That';
    const currencyOptions = [{
      value: 'USD',
      label: 'US Dollar'
    }, {
      value: 'EUR',
      label: 'Euro'
    }, {
      value: 'GBP',
      label: 'British Pound'
    }];

    return (
      <div className='page-exchange'>
        <section className='exchange-header'>
          <h1>{title}</h1>
          <p>Discover optimal cryptocurrency trading pairs</p>
        </section>
        <Inputs
          buyMode={this.state.buyMode}
          coins={this.state.coins}
          exchanges={this.state.exchanges}
          exchange={this.state.exchange}
          selectedCoin={this.state.selectedCoin}
          updateCoin={this.updateCoin.bind(this)}
          exchangeTypes={this.state.exchangeTypes}
          updateExchangeTypes={this.updateExchangeTypes.bind(this)}
          sellAmount={this.state.sellAmount}
          updateSellAmount={this.updateSellAmount.bind(this)}
          updateExchange={this.updateExchange.bind(this)}
        />
        {this.renderResults()}
        <div className='exchange-currency'>
          <Select
            className='exchange-currency-local'
            options={currencyOptions}
            value={this.state.localCurrency}
            onChange={this.updateCurrency.bind(this)}
            clearable={false}
          />
        </div>
        {this.renderModeSwitcher()}
        <footer>
          <div>
            <p className='footer-thanks'>
              If this tool has helped you, please leave a tip!
            </p>
            <p>
              <strong>BTC:</strong> <code>18G9A5z2opkncGMLFnZTL8J2EvkUy1c8bE</code><br/>
              <strong>ETH:</strong> <code>0xB72C1bf228096f7452150D493B04547538b0188e</code><br/>
              <strong>LTC:</strong> <code>LUwm8KRumrGNDwuMDyB1rLJwKv5zCcu3Ab</code><br/>
            </p>
          </div>
          <small>Data sourced from <a href='https://www.cryptocompare.com/api' rel='noopener noreferrer' target='_blank'>CryptoCompare</a>. Not all trading pairs shown are available in actuality. Data shown is not guaranteed to be accurate. Use this tool at your own discretion.</small>
        </footer>
      </div>
    );
  }
}

export default App;
