import { useState, useEffect } from 'react';
import Web3 from 'web3';
import lotteryContract from './blockchain/lottery'; // Lottery contract file
import uzarContract from './blockchain/uzar'; // UZAR token contract file
import styles from '../styles/Home.module.css';
import 'bulma/css/bulma.css';

const style = {
  wrapper: ``,
  walletConnectWrapper: `flex flex-col justify-center items-center h-screen w-screen bg-[#3b3d42] `,
  button: `border border-[#282b2f] bg-[#2081e2] p-[0.8rem] text-xl font-semibold rounded-lg cursor-pointer text-black`,
  details: `text-lg text-center text=[#282b2f] font-semibold mt-4`,
};

export default function Home() {
  const [web3, setWeb3] = useState('');
  const [address, setAddress] = useState('');
  const [lcContract, setLcContract] = useState('');
  const [zarContract, setZarContract] = useState('');
  const [uzarBalance, setUzarBalance] = useState('');
  const [lotteryPot, setLotteryPot] = useState('');

  const [lotteryPlayers, setPlayers] = useState('')
  const [lotteryHistory, setLotteryHistory] = useState('')
  const [lotteryId, setLotteryId] = useState('')

  const [entryFee, setEntryFee] = useState('');
  const [, setIsApproved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');


  

  useEffect(() => {
    if (lcContract && zarContract) updateState();
  }, [lcContract, zarContract]);

  const updateState = async () => {
    if (lcContract) {
      await getPot();
      await getPlayers()
      await getLotteryId()
      await getEntryFee();
      await checkAllowance();
    }
    if (zarContract) {
      await getUserUzarBalance();
    }
  };

  const getPlayers = async () => {
    const players = await lcContract.methods.getPlayers().call()
    setPlayers(players)
  }

  const getHistory = async (id) => {
    setLotteryHistory([])
    for (let i = parseInt(id); i > 0; i--) {
      const winnerAddress = await lcContract.methods.lotteryHistory(i).call()
      setLotteryHistory(lotteryHistory => [...lotteryHistory, { id: i, address: winnerAddress }])
    }
  }

  const getLotteryId = async () => {
    const lotteryId = await lcContract.methods.lotteryId().call()
    setLotteryId(lotteryId)
    await getHistory(lotteryId)
  }

  const getPot = async () => {
    const pot = await lcContract.methods.getBalance().call();
    setLotteryPot(web3.utils.fromWei(pot, 'ether'));
  };

  const getEntryFee = async () => {
    const fee = await lcContract.methods.entryFee().call();
    setEntryFee(web3.utils.fromWei(fee, 'ether'));
  };

  const getUserUzarBalance = async () => {
    const balance = await zarContract.methods.balanceOf(address).call();
    setUzarBalance(web3.utils.fromWei(balance, 'ether'));
  };

  const checkAllowance = async () => {
    const allowance = await zarContract.methods.allowance(address, lcContract.options.address).call();
    setIsApproved(parseFloat(web3.utils.fromWei(allowance, 'ether')) >= entryFee);
  };

  /*
  const approveUzar = async () => {
    try {
      await zarContract.methods
        .approve(lcContract.options.address, web3.utils.toWei(entryFee, 'ether'))
        .send({ from: address });
      setIsApproved(true);
      setSuccessMsg('Approval successful!');
    } catch (err) {
      setError(err.message);
    }
  };
  */

  const enterLotteryHandler = async () => {
    setError('');
    setSuccessMsg('');
  
    try {
      // 1. Check if the contract is already approved
      const allowance = await zarContract.methods.allowance(address, lcContract.options.address).call();
  
      if (parseInt(allowance) < 5 * 10 ** 18) {
        // 2. If not approved, request approval
        await zarContract.methods
          .approve(lcContract.options.address, web3.utils.toWei('5', 'ether'))
          .send({
            from: address,
            gas: 150000,
            gasPrice: null,
          });
        setSuccessMsg('UZAR approved successfully.');
      }
  
      // 3. Enter the lottery after approval
      await lcContract.methods.enter().send({
        from: address,
        gas: 250000,
        gasPrice: null,
      });
  
      setSuccessMsg('You have entered the lottery successfully.');
      updateState(); // Update the UI with the latest state
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
    }
  };
  

  const connectWalletHandler = async () => {
    setError('');
    setSuccessMsg('');
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        const accounts = await web3Instance.eth.getAccounts();
        setAddress(accounts[0]);

        const lc = lotteryContract(web3Instance);
        setLcContract(lc);

        const zar = uzarContract(web3Instance);
        setZarContract(zar);

        window.ethereum.on('accountsChanged', async () => {
          const accounts = await web3Instance.eth.getAccounts();
          setAddress(accounts[0]);
        });
      } catch (err) {
        setError(err.message);
      }
    } else {
      console.log('Please install MetaMask');
    }
  };

  const pickWinnerHandler = async () => {
    setError('')
    setSuccessMsg('')
    console.log(`address from pick winner :: ${address}`)
    try {
      await lcContract.methods.pickWinner().send({
        from: address,
        gas: 250000,
        gasPrice: null
      })
    } catch(err) {
      setError(err.message)
    }
  }

  const payWinnerHandler = async () => {
    setError('')
    setSuccessMsg('')
    try {
      await lcContract.methods.payWinner().send({
        from: address,
        gas: 250000,
        gasPrice: null
      })
      console.log(`lottery id :: ${lotteryId}`)
      const winnerAddress = await lcContract.methods.lotteryHistory(lotteryId).call()
      setSuccessMsg(`The winner is ${winnerAddress}`)
      updateState()
    } catch(err) {
      setError(err.message)
    }
  }

  return (
    <div className={style.wrapper}>
      <div className={style.walletConnectWrapper}>
        <button onClick={connectWalletHandler} className={style.button}>
          Connect Wallet
        </button>
        <div className={style.details}>
          <h2>Connected Address: {address}</h2>
          <h3>UZAR Balance: {uzarBalance} UZAR</h3>
          <h3>Lottery Pot: {lotteryPot} UZAR</h3>
          <h3>Entry Fee: {entryFee} UZAR</h3>
          <button onClick={enterLotteryHandler} className={style.button}>
            Enter Lottery
          </button>
          {successMsg && <p>{successMsg}</p>}
          {error && <p>{error}</p>}
        </div>
      </div>

      <div >
        <nav className="navbar-center">
          <div className="container bg-dark">
            <div className="navbar-center">
            
            </div>
            
          </div>
        </nav>
        <div className="container">
          <section className="mt-5">
            <div className="columns">
              <div className="column">
                <section className="mt-5">
                  <p>Enter the lottery by sending 5 UZAR:</p>
                  <button onClick={enterLotteryHandler} className="button is-link is-large is-light mt-3">Play now</button>
                </section>
                <section className="mt-6">
                  <p><b>Admin only:</b> Pick winner</p>
                  <button onClick={pickWinnerHandler} className="button is-primary is-large is-light mt-3">Pick winner</button>
                </section>
                <section className="mt-6">
                  <p><b>Admin only:</b> Pay winner</p>
                  <button onClick={payWinnerHandler} className="button is-success is-large is-light mt-3">Pay winner</button>
                </section>
                <section>
                  <div className="container has-text-danger mt-6">
                    <p>{error}</p>
                  </div>
                </section>
                <section>
                  <div className="container has-text-success mt-6">
                    <p>{successMsg}</p>
                  </div>
                </section>
              </div>
              <div className="column">
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Lottery History</h2>
                        {
                          (lotteryHistory && lotteryHistory.length > 0) && lotteryHistory.map(item =>{
                            if (lotteryId != item.id) {
                              return <div className="history-entry mt-3" key={item.id}>
                                <div>Lottery #{item.id} winner:</div>
                                <div>
                                  <a href={`https://etherscan.io/address/633C37/${item.address}`} target="_bank">
                                    {item.address}
                                  </a>
                                </div>
                              </div>
                            }
                           })
                        } 
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Players({lotteryPlayers.length})</h2>
                        <ul className="ml=0">
                          {
                            (lotteryPlayers && lotteryPlayers.length > 0) && lotteryPlayers.map((player, index) => {
                              return <li key={`${player}-${index}`}>
                                <a href={`https://etherscan.io/address/${player}`} target="_bank">
                                  {player}
                                </a>
                              </li>
                            })
                          }  
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Pot</h2>
                        <p>{lotteryPot} UZAR</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2024 GoldRush</p>
      </footer>
    </div>
  );
}
