const { ethers, upgrades } = require("hardhat");

async function main() {
    const [
        deployer,
        dev1,
        dev2,
        dev3,
        player1,
        player2,
        player3,
        player4
    ] = await ethers.getSigners();

    const ContentManager = await ethers.getContractFactory("ContentManager");
    // const rawrshakContractManager = ContentManager.attach("0x79058587a4D5f2b705C9B315ADd23c56A6607508");

    // var rawrshakUpdatePublicUri = [
    //     [0, "QmNQecdZ5CkwnmCZXhaZQCHzcVofZiuDCMHUKQnDfyqZ9i"],
    //     [1, "QmZpLYhd1BLFZREpKLYxxPJ1WKHjKz1H9QN71eiByXJztL"],
    //     [2, "QmZZeefCU617nbnsCNvXKYrZ6n8xADM2tAtuefQPVocxPx"],
    //     [3, "QmUgDTwCthUvMmq8ij9AcbB97PYFQY8HHU73QbjwLAJTvC"],
    //     [4, "QmbkUs6QEZUVkQJWQhVRs3e6K8YrNURgH5TxAnRVS6CVjt"],
    //     [5, "QmXSDQuyUBBNHQ5XqEfwG8eCYL2FNscUa1azb5AfetZZ87"]
    // ];

    // await rawrshakContractManager.connect(dev1).setPublicUriBatch(rawrshakUpdatePublicUri);
    
    // scream fortress asset updates
    const screamFortressContractManager = ContentManager.attach("0x579e73C522b8Dca7007a341D06E6B2394C23644c");

    var screamFortressUpdatePublicUri = [
        [0, "Qmb9gJTV4scpXX1n1QiPiWoEAw77VBXX3u7nESihs1SVv9"],
        [1, "QmNRwzCQP4xZpuySPs3osdKnXrCts4SsdyRaR5BsShCN6u"],
        [2, "QmPcSGFyTkMQepEgguRpBQSaEsYddEbszezD2kSrmkJ6Fo"],
        [3, "QmVq2BuYCEz5FDzMZiMBhghvUM9izotJW1a9k7TwBN93Uq"],
        [4, "QmVdG2MkEtbKbqNFw6JrVMXMLyGJE5Utrk6jxwAK3jnQBW"],
        [5, "Qmb76NhCKj94r7uGH1KGwzkGKk4K22AtCg6xzpf1tpF9iL"],
        [6, "QmbKzPM8DhE6Tupu2dbo1tFe8J87pTWWd1AzuakvJJdeg5"],
        [7, "QmTajgBSjkAce1BobV46zCReds4WcbmAj9M3yP9wcy7xEm"],
        [8, "QmU1A8xckH9JNE7Z31mks3tXF3EmmKrzeRMMDEKgW9dhrj"]
    ];

    await screamFortressContractManager.connect(dev1).setPublicUriBatch(screamFortressUpdatePublicUri);
    
    // fight buddy asset updates
    const fightBuddyContractManager = ContentManager.attach("0xadeB62FCC2BB7979DC7848968f46E30eFe62d8F8");

    var fightBuddyUpdatePublicUri = [
        [0, "QmPdtxxeUd9VZmWymbKk5JPCDu5kD8zzW1scqD8LP6Lnsg"],
        [1, "QmTQWALdd4qmpmDaWbP5duGVc1ze2xtwN4ozHzucGCyyTn"],
        [2, "QmVEjcyKWT1j7VkGKwxQPPuM8Sr2qBgLaMtzuvVSbj8HKT"],
        [3, "Qmb669NH1Gh6euWXBbRD7vteF4wNRdHySPFLsbarfKLwwn"]
    ];

    await fightBuddyContractManager.connect(dev2).setPublicUriBatch(fightBuddyUpdatePublicUri);
    
    // SuperScaryHorrorGame asset updates
    const superScaryHorrorGameContractManager = ContentManager.attach("0x0a821abfb0c5c9db497d5d0468D10e7c17e8BfF5");

    var superScaryHorrorGameUpdatePublicUri = [
        [0, "QmUoqmCgQshxtHPjeuMmQTWhJhf6PFCtzzTXzs1YSANmG7"],
        [1, "QmcRScbPW6b1HGaZFYhMPKB3T83pn8NX76WEfGMNaSooDY"],
        [2, "Qme3JAQurrn5Qnw8GqkMTztrdzVmEStYyVZ4TAL6znP98q"],
        [3, "QmXFZub1zZvtw6bXHknqAeGD4MoQB4vmcckWpr6bpnvcrZ"]
    ];

    await superScaryHorrorGameContractManager.connect(dev3).setPublicUriBatch(superScaryHorrorGameUpdatePublicUri);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
