import lotteryAbi from "./abi.json";

const lotteryContract = web3 => {
    return new web3.eth.Contract(
        lotteryAbi,
        "0x694E778589b0BCA0edD6933892a3c63B95A1518c"
    )
}

export default lotteryContract


// 0xd2Afc8f244b1340bfdf76c851aeEEe6f554566B6 old address
// 0x07381A89Ba4cD6A1e73Cbdd49Cc62c0596a8570f