let JsonDB = require('node-json-db');
const path = require('path');

const log = require('./log');
const core = require('./core');
const block = require('./../src/block');
const mining = require('./../src/mining');

let blocksDb;
let peersDb;

module.exports = {
  // Get all the saved peers
  getSavedPeers: function() {
    try {
      return peersDb.getData("/peers");
    } catch(e) {
      peersDb.push("/peers", []);
      return peersDb.getData("/peers");
    }

    /*{
      "peers": [
        { "ip": "192.168.0.1", "last_seed": "2023-04-18T14:25:36Z" },
        { "ip": "10.0.0.2", "last_seed": "2023-04-19T09:15:22Z" }
      ]
    } */
  },

  // Save or update a specific peer
  savePeer: function(ip, last_seen) {
    let resultSuccess = false;
    try {
      let peers = peersDb.getData("/peers");

      // Search if peer exists
      let foundId = -1;
      for(let i = 0; i < peers.length; i++) {
        if(peers[i].ip == ip) {
          foundId = i;
        }
      }

      // If peer id has been found 
      if(foundId == -1) {
        // Push into array
        peers.push({ ip, last_seen }); 
      } else {
        peers[foundId]['last_seen'] = last_seen;
      }

      // Save array
      peersDb.push("/peers", peers);

      // Return true success
      resultSuccess = true;
      return resultSuccess;
    } catch(e) {
      // Return false success
      return resultSuccess;
    }
  },

  checkGenesis: async function() {
    return new Promise(async (resolve, reject) => {
      let blockData;
      try {
        // Check if genesis block has been created
        blockData = { ...blocksDb.getData("/1") };
      } catch(e) {
        // Create genesis block
        blocksDb.push("/1", block.geneisBlock());
        blockData = { ...blocksDb.getData("/1") };
      }

      // Delete hash from database block
      delete blockData.hash;

      // Test mine database genesis block and check if it is valid
      let mineDb = await mining.mineBlock(blockData, "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      let verificationDb = mining.verifyBlock(block.geneisBlock().hash, blockData, mineDb.nonce);

      // Test mine hardcoded genesis block
      let hardBlock = { ...block.geneisBlock() };
      delete hardBlock.hash;
      let mineHard = await mining.mineBlock(hardBlock, "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      
      // Get the data again but this time do not delete 'hash'
      blockData = { ...blocksDb.getData("/1") };

      // Check every value in order to continue the daemon
      if(!verificationDb || !(blockData.hash == mineDb.hash) || !(mineDb.hash == mineHard.hash)) {
        log.error(`The genesis block is invalid. Please delete './blockchain' folder to regenerate the blockchain.`);
        process.exit();
      }

      log.info(`Database has been initialized in '${path.dirname(__dirname)}\\${core.databaseFolder}'`);
      resolve();
    });
  },
  
  initDatabase: function() {
    blocksDb = new JsonDB(`${core.databaseFolder}/blocks.json`, true, true);
    peersDb = new JsonDB(`${core.databaseFolder}/peers.json`, true, true);
  }
};