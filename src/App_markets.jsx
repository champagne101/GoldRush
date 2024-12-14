/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import PredictionMarketABI from './blockchain/predictionMarketABI.json'; 
import UzarTokenABI from './blockchain/abizar.json'; 

const CONTRACT_ADDRESS = '0x27b58dF03799c527973170066dC607Ca5D85736c'; 
const UZAR_TOKEN_ADDRESS = '0xBf715EB900bbEAa2C7e136E9c2A0C6AED93E8aeb'; 

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [uzarToken, setUzarToken] = useState(null);
  const [uzarBalance, setUzarBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [markets, setMarkets] = useState([]);

  const [question, setQuestion] = useState('');
  const [expiry, setExpiry] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [betMarketId, setBetMarketId] = useState('');
  const [betYes, setBetYes] = useState(true);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const connectWalletHandler = async () => {
    setError('');
    setSuccessMsg('');
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);

        window.ethereum.on('accountsChanged', async () => {
          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);
        });

        setSuccessMsg('Wallet connected!');
      } catch (err) {
        setError(err.message);
      }
    } else {
      console.log('Please install MetaMask');
    }
  };

  
  const disconnectWalletHandler = () => {
    try {
      // Clear all states
      setWeb3(null);
      setAccount(null);

      // Remove the accountsChanged listener
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', async () => {
          const accounts = await web3.eth.getAccounts();
          setAccount(accounts[0]);
        });
      }

      setSuccessMsg('Wallet disconnected!');
    } catch (err) {
      setError('Failed to disconnect wallet: ' + err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const _web3 = new Web3(window.ethereum);
        setWeb3(_web3);

        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);

          const _contract = new _web3.eth.Contract(PredictionMarketABI, CONTRACT_ADDRESS);
          setContract(_contract);

          const _uzarToken = new _web3.eth.Contract(UzarTokenABI, UZAR_TOKEN_ADDRESS);
          setUzarToken(_uzarToken);

          fetchBalance(_web3, accounts[0], _uzarToken, _contract);
        } catch (err) {
          console.error('Error connecting to MetaMask:', err);
        }
      } else {
        alert('Please install MetaMask to use this app');
      }
    };

    init();
  }, []);

  const fetchBalance = async (_web3, account, uzarToken, contract) => {
    try {
      const balance = await uzarToken.methods.balanceOf(account).call();
      setUzarBalance(_web3.utils.fromWei(balance, 'ether'));

      const allowance = await uzarToken.methods.allowance(account, CONTRACT_ADDRESS).call();
      setAllowance(_web3.utils.fromWei(allowance, 'ether'));
    } catch (err) {
      console.error('Error fetching UZAR balance or allowance:', err);
    }
  };

  const approveUzar = async () => {
    try {
      const amountToApprove = web3.utils.toWei('1000000', 'ether'); // Approve a large amount
      await uzarToken.methods.approve(CONTRACT_ADDRESS, amountToApprove).send({ from: account });
      alert('UZAR approved successfully');
      fetchBalance(web3, account, uzarToken, contract); // Refresh allowance
    } catch (err) {
      console.error('Error approving UZAR:', err);
    }
  };

  const createMarket = async () => {
    if (!question || !expiry) return alert('Please enter a question and expiry timestamp');
    try {
      await contract.methods
        .createMarket(question, Math.floor(new Date(expiry).getTime() / 1000))
        .send({ from: account });
      alert('Market created successfully');
      fetchMarkets();
    } catch (err) {
      console.error('Error creating market:', err);
    }
  };

  const placeBet = async () => {
    if (!betMarketId || !betAmount) return alert('Please enter a market ID and bet amount');

    if (parseFloat(betAmount) > parseFloat(uzarBalance)) {
      return alert('Insufficient UZAR balance to place this bet.');
    }

    if (parseFloat(betAmount) > parseFloat(allowance)) {
      return alert('UZAR allowance is insufficient. Please approve UZAR first.');
    }

    try {
      const amountInWei = web3.utils.toWei(betAmount, 'ether');
      await contract.methods
        .placeBet(betMarketId, betYes, amountInWei)
        .send({ from: account });
      alert('Bet placed successfully');
      fetchBalance(web3, account, uzarToken, contract); 
      fetchMarkets();
    } catch (err) {
      console.error('Error placing bet:', err);
    }
  };

  const claimWinnings = async (marketId) => {
    try {
      await contract.methods.claimWinnings(marketId).send({ from: account });
      alert('Winnings claimed successfully');
      fetchMarkets();
    } catch (err) {
      console.error('Error claiming winnings:', err);
    }
  };

  const fetchMarkets = async () => {
    if (contract) {
      try {
        const marketCount = await contract.methods.getMarketCount().call();
        const _markets = [];
        for (let i = 0; i < marketCount; i++) {
          const market = await contract.methods.getMarket(i).call();
          _markets.push({
            id: i,
            question: market[0],
            yesPool: web3.utils.fromWei(market[1], 'ether'),
            noPool: web3.utils.fromWei(market[2], 'ether'),
            expiryTimestamp: new Date(parseInt(market[3]) * 1000).toLocaleString(),
            resolved: market[4],
            outcome: market[5],
          });
        }
        setMarkets(_markets);
      } catch (err) {
        console.error('Error fetching markets:', err);
      }
    }
  };

  return (
    <div>

    <div>
      <button onClick={connectWalletHandler}>Connect Wallet</button>
      <button onClick={disconnectWalletHandler} disabled={!account}>
        Disconnect Wallet
      </button>
      {account && <p>Connected Address: {account}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}
    </div>
      <h1>Prediction Market</h1>
      <p>Connected Account: {account}</p>
      <p>UZAR Balance: {uzarBalance} UZAR</p>
      <p>UZAR Allowance: {allowance} UZAR</p>
      <button onClick={approveUzar}>Approve UZAR</button>

      <section>
        <h2>Create Market</h2>
        <input
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <input
          type="datetime-local"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
        <button onClick={createMarket}>Create Market</button>
      </section>

      <section>
        <h2>Place Bet</h2>
        <input
          type="number"
          placeholder="Market ID"
          value={betMarketId}
          onChange={(e) => setBetMarketId(e.target.value)}
        />
        <input
          type="number"
          placeholder="Bet Amount (UZAR)"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
        />
        <label>
          <input
            type="radio"
            checked={betYes}
            onChange={() => setBetYes(true)}
          />
          Yes
        </label>
        <label>
          <input
            type="radio"
            checked={!betYes}
            onChange={() => setBetYes(false)}
          />
          No
        </label>
        <button onClick={placeBet}>Place Bet</button>
      </section>

      <section>
        <h2>Markets</h2>
        <button onClick={fetchMarkets}>Load Markets</button>
        {markets.map((market) => (
          <div key={market.id}>
            <p>
              <strong>Question:</strong> {market.question}
            </p>
            <p>
              <strong>Yes Pool:</strong> {market.yesPool} UZAR
            </p>
            <p>
              <strong>No Pool:</strong> {market.noPool} UZAR
            </p>
            <p>
              <strong>Expiry:</strong> {market.expiryTimestamp}
            </p>
            <p>
              <strong>Resolved:</strong> {market.resolved ? 'Yes' : 'No'}
            </p>
            {market.resolved && (
              <p>
                <strong>Outcome:</strong> {market.outcome ? 'Yes' : 'No'}
              </p>
            )}
            {!market.resolved && (
              <button onClick={() => claimWinnings(market.id)}>Claim Winnings</button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default App;
