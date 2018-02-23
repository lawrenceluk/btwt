/* global ga */
import './App.css';
import 'react-select/dist/react-select.css';
import axios from 'axios';
import coins from './coinlist.json';
import exchanges from './exchanges.json'
import Inputs from './components/Inputs.js';
import Result from './components/Result.js';
import Select from 'react-select';
import React, { Component } from 'react';

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
    const coinList = Object.values(coins.Data).map((c) => {
      return {
        value: c.Name,
        label: c.CoinName,
        order: parseInt(c.SortOrder, 10),
        image: c.ImageUrl
      };
    }).sort((a, b) => { return a.order - b.order; });

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
      error: false,
      availablePairs: []
    };
    document.title =  window.location.hash !== '#sell' ? 'Buy This With That' : 'Sell This For That';
  }

  // on initialize, determine if buy or sell mode
  componentDidMount() {
    window.addEventListener('hashchange', this.updateMode.bind(this, null), false);
    this.refresh();
  }

  // switch between buy and sell mode
  updateMode() {
    this.setState({
      buyMode: window.location.hash !== '#sell'
    }, () => {
      document.title = this.state.buyMode ? 'Buy this, with that' : 'Sell this, for that';
      this.refresh();
    });
  }

  // localStorage helpers
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
    console.log(this.state.coinResponse);
    const matches = this.state.coinResponse.RAW[selectedCoin.value];
    console.log('rec', typeof matches, matches, Object.keys(matches), Object.values(matches));

    // transform price into something parsable
    Object.values(matches).forEach((data) => {
      console.log(data);
      data.priceFloat = parseFloat(data.PRICE);
    });
    Object.keys(matches).forEach((key) => {
      console.log(key);
      // delete if 0 volume
      if (matches[key].TOTALVOLUME24H === 0) {
        delete matches[key];
      }
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
      if (matches[sym]) {
        if (this.state.buyMode) {
          matches[sym].buyingPower = ((conversions[sym]*1000) / matches[sym].priceFloat).toFixed(6);
        } else {
          matches[sym].buyingPower = ((1 / conversions[sym]) * matches[sym].priceFloat).toFixed(6) * (parseFloat(this.state.sellAmount) || 1);
        }
        matches[sym].localRate = conversions[sym];
        matches[sym].symbol = sym;
      }
    });

    // get best buying power
    var best = Object.values(matches).sort((a, b) => { return parseFloat(b.buyingPower) - parseFloat(a.buyingPower); })[0];
    matches[best.symbol].best = true;

    this.setState({
      loading: false,
      matches: matches
    })
  }

  // makes ajax calls to populate coinResponse and currencyResponse
  refresh() {
    this.setState({
      loading: true
    })
    const selectedCoin = this.state.selectedCoin;
    const localCurrency = this.state.localCurrency;
    const exchange = (this.state.exchange && this.state.exchange !== 'Any') ? ('&e=' + this.state.exchange) : '';
    let convertTo = (this.state.localCurrency + ',' + this.state.exchangeTypes).split(',');

    // if we're limiting to one exchange, see what pairs it supports
    if (this.state.exchange && this.state.exchange !== 'Any') {
      const availablePairs = this.state.exchanges[this.state.exchange] || {};
      if (selectedCoin.value in availablePairs) {
        this.setState({
          availablePairs: availablePairs[selectedCoin.value]
        });
        convertTo = convertTo.filter((val) => {
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
      .catch((error) => {
        console.warn(error);
      });
    })
    .catch((error) => {
      console.warn(error);
    });
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
    if (this.state.error || !this.state.matches) {
      if (this.state.exchange && this.state.exchange !== 'Any') {
        return (
          <div className='exchange-result-error'>
            {this.state.exchange} does not have trading pairs for {this.state.exchangeTypes.split(',').join(', ')}.
          </div>
        );
      } else if (!this.state.loading) {
        return (
          <div className='exchange-result-error'>
            Error retrieving results - please try again later.
          </div>
        );
      }
    }

    const matches = this.state.matches;
    if (!matches || Object.keys(matches).length === 0) { return false; }

    let currencyLogo = this.state.localCurrency.toLowerCase();
    // use dollar symbol for AUD
    if (this.state.localCurrency === 'AUD') {
      currencyLogo = 'usd';
    }

    const results = Object.keys(matches).map((sym, i) => {
      return <Result
          key={i}
          symbol={sym}
          localCurrency={this.state.localCurrency}
          selectedCoin={this.state.selectedCoin}
          matches={matches}
          coins={this.state.coins}
          currencyLogo={currencyLogo}
          buyMode={this.state.buyMode}
        />

    });

    return (
      <div className='exchange-output'>
        {results}
      </div>
    );
  }

  renderFooter() {
    if (this.state.loading) {
      return false;
    }
    return (
      <footer>
        <div>
          <p className='footer-thanks'>
            If this tool has helped you, please leave a tip!
          </p>
          <p>
            <code><strong>BTC:</strong> 18G9A5z2opkncGMLFnZTL8J2EvkUy1c8bE</code><br/>
            <code><strong>ETH:</strong> 0xB72C1bf228096f7452150D493B04547538b0188e</code><br/>
            <code><strong>LTC:</strong> LUwm8KRumrGNDwuMDyB1rLJwKv5zCcu3Ab</code><br/>
          </p>
        </div>
        <div className='social'>
          <a className="twitter-share-button" href="https://twitter.com/intent/tweet?text=Buy%20This%20With%20That%20-%20the%20simple%20cryptocurrency%20arbitrage%20calculator">
            <span className='fa fa-twitter'></span>
          </a>
          <div className="fb-share-button" data-href="https://buythiswiththat.com/" data-layout="button" data-size="small" data-mobile-iframe="true"><a className="fb-xfbml-parse-ignore" rel='noopener noreferrer' target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fbuythiswiththat.com%2F&amp;src=sdkpreparse">Share</a></div>
        </div>
        <small>Data sourced from <a href='https://www.cryptocompare.com/api' rel='noopener noreferrer' target='_blank'>CryptoCompare</a>. Not all trading pairs shown are available in actuality. Data shown is not guaranteed to be accurate. Use this tool at your own discretion.</small>
      </footer>
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
    }, {
      value: 'AUD',
      label: 'Australian Dollar'
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
          availablePairs={this.state.availablePairs}
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
        {this.renderFooter()}
      </div>
    );
  }
}

export default App;
