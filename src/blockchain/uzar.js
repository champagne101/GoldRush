import uzarAbi from "./abizar.json";

const uzarContract = web3 => {
    return new web3.eth.Contract(
        uzarAbi,
        "0xE29E8434FF23c4ab128AEA088eE4f434129F1Bf1"
    )
}

export default uzarContract


// 0xd2Afc8f244b1340bfdf76c851aeEEe6f554566B6 old address
// 0x07381A89Ba4cD6A1e73Cbdd49Cc62c0596a8570f