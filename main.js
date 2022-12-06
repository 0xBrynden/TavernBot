// Personal bot with filtered notification
// -- listen to blockchain events
// -- send msg to Telegram
// ====

const { ethers, BigNumber } = require("ethers")
const { formatEther, parseEther } = require('ethers/lib/utils');
require('dotenv').config();
const fs = require('fs')
const Web3WsProvider = require('web3-providers-ws');

const { getHeroDetailedInfo } = require('./utilities/getHero.js');

const {uploadObject, downloadObject, lastObjectKey} = require('./utilities/s3.js');

// = - = - = - = - = - = - =
// 1. TELEGRAM BOT
// = - = - = - = - = - = - =

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true});
const {
  newAuctionMessageT,
  auctionEndedMessageT
} = require('./utilities/telegramMessages.js');

const DEV_CHAT_ID = parseInt(process.env.DEV_CHAT_ID);

// errors
bot.on("polling_error", (err) => console.log(err));

// = - = - = - = - = - = - =
// 2. ETHERS PROVIDERS
// = - = - = - = - = - = - =

// harmony
//const WSS_URLS_HARMONY = process.env.WSS_URLS_HARMONY.split(",");
const HTTP_URLS_HARMONY = process.env.HTTP_URLS_HARMONY.split(",");
const TOT_URLS_HARMONY = HTTP_URLS_HARMONY //WSS_URLS_HARMONY.concat(HTTP_URLS_HARMONY)
// dfk
const HTTP_URLS_DFK = process.env.HTTP_URLS_DFK.split(",");

let selectedProvider = {
  "SD": null,
  "CV": null,
}
let providers = {
  "SD": [],
  "CV": [],
};
const TAVERN_ADDRESSES = [
  "0x13a65b9f8039e2c032bc022171dc05b30c3f2892",  // SD
  "0xc390fAA4C7f66E4D62E59C231D5beD32Ff77BEf0",  // CV
]
const newAuctionEventId = "0x9a33d4a1b0a13cd8ff614a080df31b4b20c845e5cde181e3ae6f818f62b6ddde";
const closeAuctionEventId = ethers.utils.id("AuctionSuccessful(uint256,uint256,uint256,address)");
const tavernFilter = {
  "SD" : {
    address: TAVERN_ADDRESSES[0],
    fromBlock: 'latest',
  },
  "CV" : {
    address: TAVERN_ADDRESSES[1],
    fromBlock: 'latest',
  },
}

// - - - -

function selectProvider(n, chain){
  try {
    providers[chain][selectedProvider[chain]].polling = false
    providers[chain][selectedProvider[chain]].removeAllListeners(tavernFilter[chain])  
  } catch { }
  selectedProvider[chain] = n;
  auctionEventListener(chain);
}

const getProvider = (url, isHttp, chain) => {
  console.log("getProvider url=", url)
  let provider;
  if (isHttp) {
    provider = new ethers.providers.JsonRpcProvider(url);
  } else {
    provider = new ethers.providers.Web3Provider(
      new Web3WsProvider(url, {
        clientConfig: {
          keepalive: true,
          keepaliveInterval: 60000, // ms
        },
        // Enable auto reconnection
        reconnect: {
          auto: true,
          delay: 5000, // ms
          maxAttempts: 5,
          onTimeout: false
        }
      }),
    )
    provider.on('close', () => {
      setTimeout(() => {
        // go to backup
        selectProvider(0, chain)
      }, 5*1000);
    });
  }

  provider.on('error', () => console.log("URL "+url+" error"));
  return provider;
};

// start
//for (var i = 0; i < WSS_URLS_HARMONY.length; i++) {
//  const provider = getProvider(WSS_URLS_HARMONY[i], false, 'SD');
//  providers['SD'].push(provider);
//}
for (var i = 0; i < HTTP_URLS_HARMONY.length; i++) {
  const provider = getProvider(HTTP_URLS_HARMONY[i], true, 'SD');
  providers['SD'].push(provider);
}
for (var i = 0; i < HTTP_URLS_DFK.length; i++) {
  const provider = getProvider(HTTP_URLS_DFK[i], true, 'CV');
  providers['CV'].push(provider);
}

setInterval(() => {
  //console.log("providers = ", providers)
  console.log("Current URL SD: " + TOT_URLS_HARMONY[selectedProvider['SD']]);
  console.log("Current URL CV: " + HTTP_URLS_DFK[selectedProvider['CV']]);
}, 120*1000);


// = - = - = - = - = - = - =
// 3. STORAGE I/O
// = - = - = - = - = - = - =

let filters = {}

function saveNewFilter(user, gen, rar, prof, class_, summons, price) {
  if (!(user in filters)) filters[user] = []
  filters[user].push({
    generations: gen,
    rarity: rar,
    profession: prof,
    class: class_,
    summons: summons,
    price: price
  })
  saveMemoryRemote(filters).then(() => {
    console.log("...uploaded")
  })
}

async function saveMemoryRemote(mem) {
  const key = "filters.json"
  await uploadObject(key, mem);
  //await saveMemoryLocal(mem)
}

async function readLastStorageRemote() {
  try {
    console.log("READING FILTERS REMOTELY...")
    filters = await downloadObject("filters.json");
  } catch {
    try {
      console.log("READING FILTERS LOCALLY...")
      await readStorageLocal()
    } catch {
      console.log("NO FILTERS. START EMPTY.")
      filters = {}
    }
  }
  console.log("filters = ", filters)
}

async function saveMemoryLocal(mem) {
  const jsonString = JSON.stringify(mem);
  fs.writeFile('./storage.json', jsonString, err => {
    if (err) {
      console.log('Error writing file: ', err);
    } else {
      console.log('Successful file write');
    }
  });
}

async function readStorageLocal() {
  fs.readFile('./storage.json', (err, jsonString) => {
    if (err) {
      console.log("File read failed: ", err);
      filters = {};
      return
    }
    try {
      filters = JSON.parse(jsonString);
      console.log("Successful file read");
    } catch (err) {
      console.log("Error in parsing json: ", err);
      filters = {};
    }
  });
}

// = - = - = - = - = - = - =
// 4. BLOCKCHAIN EVENTS
// = - = - = - = - = - = - =

function auctionEventListener(chain) {
  console.log(`Preparing to listening ${chain} ...`);
  providers[chain][selectedProvider[chain]].ready.then(async () => {
    providers[chain][selectedProvider[chain]].polling = true
    if (providers[chain][selectedProvider[chain]].listenerCount(tavernFilter[chain]) > 0) { return; }
    providers[chain][selectedProvider[chain]].on(tavernFilter[chain], async(log,event) => {
      if (log.topics[0] === newAuctionEventId) {
        await NewAuction(log, chain)
      } else if (log.topics[0] === closeAuctionEventId) {
        await AuctionEnded(log, chain)
      }
    })
    
    console.log(`Listening to Tavern Events ${chain}`);
  }).catch(() => {
    setTimeout(() => { auctionEventListener(chain); }, 2*1000);
  });
}

async function NewAuction(log, chain) {
  
  //seller = log.topics[1];
  //  seller = ethers.utils.hexDataSlice(seller, 12);
  let heroId = log.topics[2];
    heroId = BigNumber.from(heroId).toString()
  let price = ethers.utils.hexDataSlice(log.data, 32, 64);
    price = Math.round(formatEther(BigNumber.from(price)))
  //price2 = ethers.utils.hexDataSlice(log.data, 64, 96);
  //  price2 = Math.round(formatEther(BigNumber.from(price2)))
  let private = ethers.utils.hexDataSlice(log.data, 32*4, 32*5);
    private = Math.round(formatEther(BigNumber.from(private)))
  
  if (private > 0) { return; }  // tx was private sell
  
  await getHeroDetailedInfo(providers[chain][selectedProvider[chain]], heroId, chain).then(async (heroattr) => {
    let rar = heroattr.rarity
    let gen = heroattr.generation
    let prof = heroattr.profession
    let class_ = heroattr.class;
    let summons = heroattr.maxsummons - heroattr.freesummons
    if (heroattr.generation == 0) summons = 11  // just at least 10
    
    console.log("NEW AUCTION")
    
    // send messages
    let recipients = queryFilters(gen, rar, prof, class_, summons, price);
    await newAuctionMessageT(bot, recipients, heroId, price, heroattr, chain);
  })
}

async function AuctionEnded(log, chain) {
  
  let heroId = log.topics[1];
    heroId = BigNumber.from(heroId).toString()
  //let buyer = ethers.utils.hexDataSlice(log.data, 64+12, 96);
  
  // boh = ethers.utils.hexDataSlice(log.data, 0, 32);
  //   boh = BigNumber.from(boh).toString()
  let price = ethers.utils.hexDataSlice(log.data, 32, 64);
    price = Math.round(formatEther(BigNumber.from(price)))
  
  await getHeroDetailedInfo(providers[chain][selectedProvider[chain]], heroId, chain).then(async (heroattr) => {
    let rar = heroattr.rarity
    let gen = heroattr.generation
    let prof = heroattr.profession
    let class_ = heroattr.class;
    let summons = heroattr.maxsummons - heroattr.freesummons
    if (heroattr.generation == 0) summons = 11  // just at least 10
    
    console.log("AUCTION ENDED")
    
    // send messages
    let recipients = queryFilters(gen, rar, prof, class_, summons, price);
    await auctionEndedMessageT(bot, recipients, heroId, price, heroattr, chain);    
  })
}

// = - = - = - = - = - = - =
// 5. BOT STUFF
// = - = - = - = - = - = - =

// ------
// temporary variables
// every user should have its own variable
let pendingGenerations = {}
let pendingRarity = {}
let pendingProfession = {}
let pendingClass1 = {}
let pendingClass2 = {}
let pendingClass3 = {}
let pendingSummons = {}
let pendingPrice = {}
let cancelMessage = {}
let poll1Message = {}
let poll2Message = {}
let poll3Message = {}
let poll4_1Message = {}
let poll4_2Message = {}
let poll4_3Message = {}
let summonsMessage = {}
let priceMessage = {}
let removeMessage = {}
let isPendingNewFilter = {}
let isPendingRemoveFilter = {}

// ------
// keyboards & msg options
const menu_keyboard = [
  [
    {
      text: '\u{2795} Add filter',
      callback_data: 'addFilter'
    },
  ],
  [
    {
      text: '\u{1F5D1} Remove filter',
      callback_data: 'removefilter'
    },
  ],
  [
    {
      text: '\u{1F4D6} My filters',
      callback_data: 'showFilters'
    },
  ],
];
const cancel_keyboard = [
  [
    {
      text: 'Cancel \u{274C}', 
      callback_data: 'abort'
    }
  ]
];
const removeFilter_keyboard = [
  [
    {
      text: 'Remove \u{1F5D1}', 
      callback_data: 'removefilter'
    }
  ]
];
const pollOpts = {
  is_anonymous : false,
  type : "regular",
  allows_multiple_answers : true,
  explanation: "You can choose multiple answers",
}
const pollGenerations = [
  "0",
  "1",
  "2",
  "3",
  "4 or greater"
]
const pollRarities = [
  "Mythic",
  "Legendary",
  "Rare",
  "Uncommon",
  "Common",
]
const pollRarityIndex = {
  "mythic": 0,
  "legendary" : 1,
  "rare" : 2,
  "uncommon" : 3,
  "common" : 4,
}
const pollProfessions = [
  "Foraging",
  "Gardening",
  "Mining",
  "Fishing"
]
const pollProfessionIndex = {
  "foraging": 0,
  "gardening" : 1,
  "mining" : 2,
  "fishing" : 3,
}
const pollClasses1 = [
  'NONE',
  'Warrior',
  'Knight',
  'Thief',
  'Archer',
  'Priest',
  'Wizard',
  'Monk',
  'Pirate',
]
const pollClasses2 = [
  'NONE',
  'Paladin',
  'DarkKnight',
  'Summoner',
  'Ninja',
  'Dragoon',
  'Sage',
  'DreadKnight'
]
const pollClasses3 = [
  'NONE',
  'Berserker',
  'Seer',
  'Shapeshifter',
]
const pollClassIndex = {
  'warrior' : 1,
  'knight' : 2,
  'thief' : 3,
  'archer' : 4,
  'priest' : 5,
  'wizard' : 6,
  'monk' : 7,
  'pirate' : 8 ,
  
  'paladin' : 10,
  'darkKnight' : 11,
  'summoner' : 12,
  'ninja' : 13,
  'dragoon' : 14,
  'sage' : 15,
  'dreadKnight' : 16,
  
  'berserker': 18,
  'seer': 19,
  'shapeshifter': 20,
}

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

// = - = - = - = - = - = - =
// 6. FILTER QUERIES
// = - = - = - = - = - = - =

// search single filter
// returns true if matches
function querySingle(filter, gen, rar, prof, class_, summons, price) {

  let x = filter.generations.includes(gen) &&
    filter.rarity.includes(pollRarityIndex[rar]) &&
    ((filter.profession === undefined) || filter.profession.includes(pollProfessionIndex[prof])) &&
    ((filter.class === undefined) || filter.class.includes(pollClassIndex[class_])) &&
    ((filter.summons === undefined) || (summons >= filter.summons)) &&
    price <= filter.price;
  return (x)
}

// search all filters that match inputs
// returns lists of users (msg.chat.id)
function queryFilters(gen, rar, prof, class_, summons, price) {
  if (gen > 4) gen=4  // because pollGenerations
  let i,j;
  let recipients = []
  for (i in filters) {  // cycle through owners
    for (j=0; j<filters[i].length; j++){  // cycle through their filters
      if (querySingle(filters[i][j], gen, rar, prof, class_, summons, price)) {
        recipients.push(i)
        break
      }
    }        
  }
  return recipients
}

// = - = - = - = - = - = - =
// 7. BOT FILTER COMMANDS
// = - = - = - = - = - = - =

// NEW filter
function newFilterHandler(msg) {
  
  const id = msg.chat.id
  
  // more together can be bad
  if (isPendingNewFilter[id]) {
    bot.sendMessage(msg.chat.id, 'You are already adding a filter.\nAbort or complete that first')
    return
  }
  if (isPendingRemoveFilter[id]) {
    bot.sendMessage(msg.chat.id, 'You have a removing filter pending.\nAbort or complete that first')
    return
  }
  isPendingNewFilter[id] = true
  
  function finish() {
    // save
    saveNewFilter(
      msg.chat.id,
      pendingGenerations[id],
      pendingRarity[id],
      pendingProfession[id],
      pendingClass1[id].concat(pendingClass2[id].map(i => i+9)).concat(pendingClass3[id].map(i => i+17)),
      pendingSummons[id],
      pendingPrice[id]
    )
    
    // clean
    bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id)
    // remove listeners
    bot.removeListener("poll_answer", pollHandler)
    bot.removeListener("message", priceHandler);
    bot.removeListener("message", summonsHandler);
    bot.removeListener("callback_query", abortHandler)
    
    // return to user
    bot.sendMessage(msg.chat.id, 'Filter correctly added.\nUse /showmyfilters to show active filters',
      {reply_markup: JSON.stringify({
        keyboard: [
          ['\u{2795} Add filter'],
          ['\u{1F5D1} Remove filter'],
          ['\u{1F4D6} My filters'],
        ],
        resize_keyboard: true,
      })}
    )
    isPendingNewFilter[id] = false
  }
  
  function abortHandler(query) {
    if (query.data != 'abort') return
    if (query.message.chat.id != id) return  // no conflicts between users
    
    bot.answerCallbackQuery(query.id, {
        text: "Add filter aborted!"
    });
    
    // remove messages sent by bot
    try {
        bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll1Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll2Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll3Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll4_1Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll4_2Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, poll4_3Message[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, summonsMessage[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, priceMessage[id].message_id)
    } catch {}
    
    // remove listeners
    bot.removeListener("poll_answer", pollHandler)
    bot.removeListener("message", summonsHandler);
    bot.removeListener("message", priceHandler);
    bot.removeListener("callback_query", abortHandler) // this for last 
    
    // return to user
    // no need for message since there's the callback
    isPendingNewFilter[id] = false
  }  
  
  function priceHandler(priceStr) {
    if (priceStr.chat.id != id) return  // no conflicts between users
    if (isNumeric(priceStr.text)) {
      const priceNum = parseInt(priceStr.text)
      pendingPrice[id] = priceNum
      bot.removeListener("message", priceHandler);
      finish()
    } else {
      bot.sendMessage(msg.chat.id, 'Please enter a correct number')
    }
  }
  
  function summonsHandler(summonsStr) {
    if (summonsStr.chat.id != id) return  // no conflicts between users
    if (isNumeric(summonsStr.text)) {
      const summonsNum = parseInt(summonsStr.text)
      pendingSummons[id] = summonsNum
      bot.removeListener("message", summonsHandler);
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      setPrice()
    } else {
      bot.sendMessage(msg.chat.id, 'Please enter a correct number')
    }
  }
  
  function pollHandler(answ) {
    if (answ.user.id != id) return  // no conflicts between users
    if (answ.poll_id === poll1Message[id].poll.id) {
      pendingGenerations[id] = answ.option_ids;
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      sendSecondPoll()
    } else if (answ.poll_id === poll2Message[id].poll.id) {
      pendingRarity[id] = answ.option_ids;
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      sendThirdPoll()
    } else if (answ.poll_id === poll3Message[id].poll.id) {
      pendingProfession[id] = answ.option_ids;
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      send4_1Poll()
    } else if (answ.poll_id === poll4_1Message[id].poll.id) {
      if (answ.option_ids[0] == 0) {
        pendingClass1[id] = []
      } else {
        pendingClass1[id] = answ.option_ids;
      }      
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      send4_2Poll()
    } else if (answ.poll_id === poll4_2Message[id].poll.id) {
      if (answ.option_ids[0] == 0) {
        pendingClass2[id] = []
      } else {
        pendingClass2[id] = answ.option_ids;
      }
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      send4_3Poll()
    } else if (answ.poll_id === poll4_3Message[id].poll.id) {
      if (answ.option_ids[0] == 0) {
        pendingClass3[id] = []
      } else {
        pendingClass3[id] = answ.option_ids;
      }
      bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id);  // remove prev cancel
      bot.removeListener("poll_answer") // no more polls - maybe not needed
      setSummons()
    }
  }
  
  
  // start here
  // first poll
  bot.sendMessage(
    msg.chat.id,
    "Adding a new filter. Please complete the process before running other commands.\n" +
    "You can choose multiple answers in the polls."
  ).then(()=>{
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired generations",
      pollGenerations,
      pollOpts
    ).then((pollMsg) => {
      poll1Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then((cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })  
  })
    
  // second poll
  function sendSecondPoll() {
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired rarities",
      pollRarities,
      pollOpts
    ).then((pollMsg) => {
      poll2Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })
  }
  
  // third poll
  function sendThirdPoll() {
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired professions",
      pollProfessions,
      pollOpts
    ).then((pollMsg) => {
      poll3Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })
  }
  
  // fourth poll (class pt1)
  function send4_1Poll() {
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired main classes (pt 1/3)",
      pollClasses1,
      pollOpts
    ).then((pollMsg) => {
      poll4_1Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })
  }
  
  // fourth poll (class pt2)
  function send4_2Poll() {
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired main classes (pt 2/3)",
      pollClasses2,
      pollOpts
    ).then((pollMsg) => {
      poll4_2Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })
  }
  
  // fourth poll (class pt3)
  function send4_3Poll() {
    bot.sendPoll(
      msg.chat.id,
      "Choose the desired main classes (pt 3/3)",
      pollClasses3,
      pollOpts
    ).then((pollMsg) => {
      poll4_3Message[id] = pollMsg
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    })
  }
  
  // numeric
  function setSummons() {
    bot.sendMessage(
      msg.chat.id,
      'Set the minimum summons remaining. Type using only numbers (0 to select everything):'
    ).then((summonsMsg) => {
      summonsMessage[id] = summonsMsg;
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    });
    bot.on('message', summonsHandler)
  }
    
  // last - price number
  function setPrice() {
    const priceOpts = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['7', '8', '9'],
          ['4', '5', '6'],
          ['1', '2', '3'],
          ['0', '', ''],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      })
    };
    bot.sendMessage(
      msg.chat.id,
      'Set the max price in Jewels/Crystals. Type using only numbers:'
    ).then((priceMsg) => {
      priceMessage[id] = priceMsg;
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    });
    bot.on('message', priceHandler)
  }
  
  // poll listener
  bot.addListener("poll_answer", pollHandler)
  
  // abort listener
  bot.addListener("callback_query", abortHandler)    
}
bot.onText(/\/newfilter/, newFilterHandler);
bot.onText(/➕ Add filter/, newFilterHandler);

// REMOVE filter
function removeFilterHandler(msg) {
  
  const id = msg.chat.id;
      
  function removeHandler(removeStr) {
    if (removeStr.chat.id != id) return  // no conflicts between users
    if (isNumeric(removeStr.text)) {
      const removeNum = parseInt(removeStr.text)
      if (removeNum === 0) {
        bot.sendMessage(msg.chat.id, 'Index goes from 1 to '+ filters[msg.chat.id].length +'. Please retry.')
      } else if (removeNum > filters[msg.chat.id].length) {
        bot.sendMessage(msg.chat.id, 'Number over the maximum index.\n'+'Index goes from 1 to '+ filters[msg.chat.id].length +'. Please retry.')
      } else {        
        filters[msg.chat.id].splice(removeNum-1, 1)  // index 1..length
        // clean
        bot.removeListener("message", removeHandler);
        bot.removeListener("callback_query", abortHandler)
        try {
          bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id)
        } catch {}        
        
        isPendingRemoveFilter[id] = false
        
        // save new filter
        //console.log("new filter...\n", filters)
        saveMemoryRemote(filters).then(() => {
          console.log("...uploaded")
        })
        
        // return to user
        bot.sendMessage(msg.chat.id, 'Filter correctly removed.\nUse /showmyfilters to show active filters',
          {reply_markup: JSON.stringify({
            keyboard: [
              ['\u{2795} Add filter'],
              ['\u{1F5D1} Remove filter'],
              ['\u{1F4D6} My filters'],
            ],
            resize_keyboard: true,
          })}
        )
      }
    } else {
      bot.sendMessage(msg.chat.id, 'Please enter a correct number')
    }
  }
  
  function abortHandler(query) {
    if(query.data != 'abort') return
    if (query.message.chat.id != id) return  // no conflicts between users
    bot.answerCallbackQuery(query.id, {
        text: "Remove filter aborted!"
    });
    
    isPendingRemoveFilter[id] = false
    
    // remove messages sent by bot
    try {
        bot.deleteMessage(msg.chat.id, cancelMessage[id].message_id)
    } catch {}
    try {
        bot.deleteMessage(msg.chat.id, removeMessage[id].message_id)
    } catch {}
    
    // remove listeners
    bot.removeListener("message", removeHandler);
    bot.removeListener("callback_query", abortHandler)
  }
  
  if (filters[msg.chat.id].length > 0) {
    if (isPendingRemoveFilter[id]) {
      // send message or do nothing ?
      return
    }
    if (isPendingNewFilter[id]) {
      bot.sendMessage(msg.chat.id, "You have a pending newfilter process.\nAbort or complete that first.")
      return
    }
    isPendingRemoveFilter[id] = true
  
    bot.sendMessage(
      msg.chat.id,
      'Choose the index # of the filter you want to remove (the number showed in the first line in /showmyfilters). Type using only numbers:',
    ).then((removeMsg) => {
      removeMessage[id] = removeMsg;
      bot.sendMessage(msg.chat.id, "Press cancel to abort", {
        "reply_markup": {
          inline_keyboard: cancel_keyboard
        }
      }).then( (cancMsg) => {
        cancelMessage[id] = cancMsg
      });
    });
    bot.on('message', removeHandler)
    
    // abort listener
    bot.addListener("callback_query", abortHandler)
  } else {
    bot.sendMessage(msg.chat.id, "You have no filters")
  }  
}
bot.onText(/\/removefilter/, removeFilterHandler)
bot.onText(/🗑 Remove filter/, removeFilterHandler)


// SHOW filters
function showFiltersHandler(msg) {
  let risp;
  if (filters[msg.chat.id] && (filters[msg.chat.id].length > 0)) {
    for (j=0; j<filters[msg.chat.id].length; j++){
      let genline, rarline, profline, classline, summonsline;
      
      // generation
      if (filters[msg.chat.id][j].generations.length == 5) {
        genline = "<b>Generations</b>: all\n"
      } else {
        genline = "<b>Generations</b>: " + filters[msg.chat.id][j].generations.join(", ") + "\n"
      }
      
      // rarity
      if (filters[msg.chat.id][j].rarity.length == 5) {
        rarline = "<b>Rarities</b>: all\n"
      } else {
        rarline = "<b>Rarities</b>: " + filters[msg.chat.id][j].rarity.map(i => pollRarities[i]).join(", ") + "\n"
      }
      
      // profession
      try {
        if (filters[msg.chat.id][j].profession.length == 4) {
          profline = "<b>Professions</b>: all\n"
        } else {
          profline = "<b>Professions</b>: " + filters[msg.chat.id][j].profession.map(i => pollProfessions[i]).join(", ") + "\n"
        }
      } catch {profline = "<b>Professions</b>: all\n"}
      
      // class
      try {
        const class1 = filters[msg.chat.id][j].class.map(i => (pollClasses1.concat(pollClasses2).concat(pollClasses3))[i]).join(", ")
        if (class1 == "") {
          classline = "<b>Main Classes</b>: NONE\n"
        } else { 
          classline = "<b>Main Classes</b>: " + class1 + "\n"
        }
      } catch {classline = "<b>Main Classes</b>: all\n"}
      
      // summons
      try {
        if (filters[msg.chat.id][j].summons) {
          summonsline = "<b>Summons at least</b>: " + filters[msg.chat.id][j].summons + "\n"
        } else {
          summonsline = "<b>Summons at least</b>: " + 0 + "\n"
        }        
      } catch {summonsline = "<b>Summons at least</b>: 0\n"}
      
      // put together
      risp = "#"+(j+1)+"\n" + 
             genline + 
             rarline +
             profline +
             classline +
             summonsline +
             "<b>Price lower than</b>: " + filters[msg.chat.id][j].price
      bot.sendMessage(msg.chat.id, risp,{parse_mode: 'HTML'})
    }   
  } else {
    bot.sendMessage(msg.chat.id, "You have no filters.\nYou won't get any message this way")
  }
}
bot.onText(/\/showmyfilters/, showFiltersHandler)
bot.onText(/📖 My filters/, showFiltersHandler)

// = - = - = - = - = - = - =
// 8. BOT MENU COMMANDS
// = - = - = - = - = - = - =

function menuHandler(msg) {  
  bot.sendMessage(msg.chat.id, "Add a filter in order to receive messages. Use /help for commands descriptions.", {
    reply_markup: JSON.stringify({  // bugged
      keyboard: [
        ['\u{2795} Add filter'],
        ['\u{1F5D1} Remove filter'],
        ['\u{1F4D6} My filters'],
      ],
      //one_time_keyboard: true,
      resize_keyboard: true,
    })
  });
}
bot.onText(/\/menu/, menuHandler);

function startHandler(msg) {
  const menuMsg = "Greetings! Looking for some special Heroes like everyone, aren't you? " + 
                  "Since the tavern is already too crowded why don't you write me what you want and go on your adventures?\n" + 
                  "\n" + 
                  "I'm always here playing dice and listening for new auctions, " + 
                  "so when a Hero you seek is sold or bought I can send you a message immediately.\n" + 
                  "\n" + 
                  "A filter is a list of preferences. You can have as many as you want. " + 
                  "For example: one filter to get rares under 200 jewels, and another to get commons under 50 jewels."
                  
  bot.sendMessage(msg.chat.id, menuMsg, {
    "reply_markup": {
      inline_keyboard: menu_keyboard
    }
  });
  
  bot.sendMessage(msg.chat.id, "Add a filter in order to receive messages. Use /help for commands descriptions.", {
    reply_markup: JSON.stringify({  // bugged
      keyboard: [
        ['\u{2795} Add filter'],
        ['\u{1F5D1} Remove filter'],
        ['\u{1F4D6} My filters'],
      ],
      //one_time_keyboard: true,
      resize_keyboard: true,
    })
  });
}
bot.onText(/\/start/, startHandler);

// menu callbacks
bot.on('callback_query', async (query) => {
  const action = query.data;
  const msg = query.message;
  
  if (action === 'addFilter') {
    newFilterHandler(msg);
  }
  if (action === 'removefilter') {
    removeFilterHandler(msg);
  }
  if (action === 'showFilters') {
    showFiltersHandler(msg);
  }
});

// legend
function legendHandler(msg) {
  const reply = "🌟 shiny animation" + "\n" + 
                "🏆 gen 0" + "\n" + 
                "Classes: 🥷 Ninja, 🔮 Sage, 🗡 Paladin, ⚔ DreadKnight, 🧙 Summoner, 🏇 Dragoon, 🐈‍⬛ DarkKnight" + "\n" + 
                "Professions emojis, the more the better (max 3), ⛏🎣🌿🌻" + "\n" + 
                "(1 base, +1 for relevant class, +1 for relevant second boosted stat)"
    
  bot.sendMessage(msg.chat.id, reply)
}
bot.onText(/\/legend/, legendHandler);

// update
function updateHandler(msg) {
  const reply = "NEW UPDATE ⚡️⚡️" + "\n" + 
                "Filters:" + "\n" + 
                "- added filter by profession; old filters are automatically on all" + "\n" + 
                "- fixed a bug that wrongly selected gen and rarity" + "\n" + 
                " " + "\n" + 
                "Visuals:" + "\n" + 
                "- now shows summons, profession and the two boosted stats" + "\n" + 
                "- new emojis:" + "\n" + 
                "-- 🌟 shiny animation" + "\n" + 
                "-- 🏆 gen 0 (as before)" + "\n" + 
                "-- 🥷ninja, 🔮 sage, 🗡 paladin, ⚔ dreadknight, 🧙 summoner, 🏇 dragoon" + "\n" + 
                "- professions emojis, the more the better (max 3), ⛏🎣🌿🌻"
    
  bot.sendMessage(msg.chat.id, reply)
}
bot.onText(/\/update/, updateHandler);

// help
bot.onText(/\/help/, (msg) => {
  const helpMsg = "Tavern Listener commands\n" + 
                  "\n" + 
                  "/newfilter - add a new filter\n" + 
                  "/removefilter - remove an existing filter\n" + 
                  "/showmyfilters - show all your active filters\n" + 
                  "/legend - show emojy legend\n" + 
                  "/update - show latest update\n" + 
                  "\n" + 
                  "For bugs reports, feature requests, etc.. write the dev on discord: BryndenRivers#1740"
  bot.sendMessage(msg.chat.id, helpMsg, {
    "reply_markup": {
     inline_keyboard: menu_keyboard
    }
  });
});

// dev
// to broadcast message
bot.onText(/\/broadcast/, (msg) => {
  if(msg.chat.id === DEV_CHAT_ID) {
    msg2 = msg.text.substring(4)
    console.log(msg)
    for (let recipient in filters) {
      try {
        bot.sendMessage(recipient, msg2);
      } catch {}  // user deleted bot
    }
  }
})


// = - = - = - = - = - = - =
// 9. START LISTENING
// = - = - = - = - = - = - =

async function start() {
  console.log("START")

  await readLastStorageRemote();
  //await readStorageLocal();
  await new Promise(resolve => setTimeout(resolve, 3*1000));
  selectedProvider['SD'] = 0
  selectProvider(0, 'SD')
  selectedProvider['CV'] = 0
  selectProvider(0, 'CV')
  
  console.log("Number of Users = ", Object.keys(filters).length)
}

start();