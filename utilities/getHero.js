const { ethers, getNamedAccounts, deployments } = require("ethers")
const { BigNumber } = require("ethers")
const { parseEther, parseUnits } = require('ethers/lib/utils');
require('dotenv').config();

const heroNFT = {
  "SD": "0x5f753dcdf9b1ad9aabc1346614d1f4746fd6ce5c",
  "CV": "0xEb9B61B145D6489Be575D3603F4a704810e143dF",
}
const heroABI = [
    "function getHero(uint256 id) external view",
    "function ownerOf(uint256 id) external view returns (address)"
]

// --
const rarityLevels = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
const choices = {
  gender: { 1: 'male', 3: 'female' },
  background: {
    0: 'desert',
    2: 'forest',
    4: 'plains',
    6: 'island',
    8: 'swamp',
    10: 'mountains',
    12: 'city',
    14: 'arctic'
  },
  class: {
    0: 'warrior',
    1: 'knight',
    2: 'thief',
    3: 'archer',
    4: 'priest',
    5: 'wizard',
    6: 'monk',
    7: 'pirate',
    8: 'berserker',
    9: 'seer',
    16: 'paladin',
    17: 'darkKnight',
    18: 'summoner',
    19: 'ninja',
    20: 'shapeshifter',
    24: 'dragoon',
    25: 'sage',
    28: 'dreadKnight'
  },
  skinColor: {
    0: 'c58135',
    2: 'f1ca9e',
    4: '985e1c',
    6: '57340c',
    8: 'e6a861',
    10: '7b4a11',
    12: 'e5ac91',
    14: 'aa5c38'
  },
  hairColor: {
    0: 'ab9159',
    1: 'af3853',
    2: '578761',
    3: '068483',
    4: '48321e',
    5: '66489e',
    6: 'ca93a7',
    7: '62a7e6',
    16: 'd7bc65',
    17: '9b68ab',
    18: '8d6b3a',
    19: '566377',
    24: '880016',
    25: '353132',
    28: '8f9bb3'
  },
  eyeColor: {
    0: '203997',
    2: '896693',
    4: 'bb3f55',
    6: '0d7634',
    8: '8d7136',
    10: '613d8a',
    12: '2494a2',
    14: 'a41e12'
  },
  appendageColor: {
    0: 'c5bfa7',
    1: 'a88b47',
    2: '58381e',
    3: '566f7d',
    4: '2a386d',
    5: '3f2e40',
    6: '830e18',
    7: '6f3a3c',
    16: '6b173c',
    17: 'a0304d',
    18: '78547c',
    19: '352a51',
    24: 'c29d35',
    25: '211f1f',
    28: 'd7d7d7'
  },
  backAppendageColor: {
    0: 'c5bfa7',
    1: 'a88b47',
    2: '58381e',
    3: '566f7d',
    4: '2a386d',
    5: '3f2e40',
    6: '830e18',
    7: '6f3a3c',
    16: '6b173c',
    17: 'a0304d',
    18: '78547c',
    19: '352a51',
    24: 'c29d35',
    25: '211f1f',
    28: 'd7d7d7'
  },
  hairStyle: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 16: 16, 17: 17, 18: 18, 19: 19, 24: 24, 25: 25, 28: 28 },
  backAppendage: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  },
  headAppendage: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  },
  subClass: {
    0: 'warrior',
    1: 'knight',
    2: 'thief',
    3: 'archer',
    4: 'priest',
    5: 'wizard',
    6: 'monk',
    7: 'pirate',
    8: 'berserker',
    9: 'seer',
    16: 'paladin',
    17: 'darkKnight',
    18: 'summoner',
    19: 'ninja',
    20: 'shapeshifter',
    24: 'dragoon',
    25: 'sage',
    28: 'dreadKnight'
  },
  profession: {
    0: 'mining',
    2: 'gardening',
    4: 'fishing',
    6: 'foraging'
  },
  passive1: {
    0: 'Basic1',
    1: 'Basic2',
    2: 'Basic3',
    3: 'Basic4',
    4: 'Basic5',
    5: 'Basic6',
    6: 'Basic7',
    7: 'Basic8',
    16: 'Advanced1',
    17: 'Advanced2',
    18: 'Advanced3',
    19: 'Advanced4',
    24: 'Elite1',
    25: 'Elite2',
    28: 'Transcendent1'
  },
  passive2: {
    0: 'Basic1',
    1: 'Basic2',
    2: 'Basic3',
    3: 'Basic4',
    4: 'Basic5',
    5: 'Basic6',
    6: 'Basic7',
    7: 'Basic8',
    16: 'Advanced1',
    17: 'Advanced2',
    18: 'Advanced3',
    19: 'Advanced4',
    24: 'Elite1',
    25: 'Elite2',
    28: 'Transcendent1'
  },
  active1: {
    0: 'Basic1',
    1: 'Basic2',
    2: 'Basic3',
    3: 'Basic4',
    4: 'Basic5',
    5: 'Basic6',
    6: 'Basic7',
    7: 'Basic8',
    16: 'Advanced1',
    17: 'Advanced2',
    18: 'Advanced3',
    19: 'Advanced4',
    24: 'Elite1',
    25: 'Elite2',
    28: 'Transcendent1'
  },
  active2: {
    0: 'Basic1',
    1: 'Basic2',
    2: 'Basic3',
    3: 'Basic4',
    4: 'Basic5',
    5: 'Basic6',
    6: 'Basic7',
    7: 'Basic8',
    16: 'Advanced1',
    17: 'Advanced2',
    18: 'Advanced3',
    19: 'Advanced4',
    24: 'Elite1',
    25: 'Elite2',
    28: 'Transcendent1'
  },
  statBoost1: {
    0: 'STR',
    2: 'AGI',
    4: 'INT',
    6: 'WIS',
    8: 'LCK',
    10: 'VIT',
    12: 'END',
    14: 'DEX'
  },
  statBoost2: { 0: 'STR', 2: 'AGI', 4: 'INT', 6: 'WIS', 8: 'LCK', 10: 'VIT', 12: 'END', 14: 'DEX' },
  element: { 0: 'fire', 2: 'water', 4: 'earth', 6: 'wind', 8: 'lightning', 10: 'ice', 12: 'light', 14: 'dark' },
  visualUnknown1: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  },
  visualUnknown2: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  },
  statsUnknown1: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  },
  statsUnknown2: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    24: 24,
    25: 25,
    28: 28
  }
}
const visualGenesMap = {
  0: 'gender',
  1: 'headAppendage',
  2: 'backAppendage',
  3: 'background',
  4: 'hairStyle',
  5: 'hairColor',
  6: 'visualUnknown1',
  7: 'eyeColor',
  8: 'skinColor',
  9: 'appendageColor',
  10: 'backAppendageColor',
  11: 'visualUnknown2'
}
const statsGenesMap = {
  0: 'class',
  1: 'subClass',
  2: 'profession',
  3: 'passive1',
  4: 'passive2',
  5: 'active1',
  6: 'active2',
  7: 'statBoost1',
  8: 'statBoost2',
  9: 'statsUnknown1',
  10: 'element',
  11: 'statsUnknown2'
}
// --
function kai2dec(kai) {
  const ALPHABET = '123456789abcdefghijkmnopqrstuvwx'
  return ALPHABET.indexOf(kai)
}

function genesToKai(genes) {
  const ALPHABET = '123456789abcdefghijkmnopqrstuvwx'
  const BASE = BigInt(ALPHABET.length)

  let buf = ''
  while (genes >= BASE) {
    const mod = genes % BASE
    buf = ALPHABET[Number(mod)] + buf
    genes = (genes - mod) / BASE
  }

  // Add the last 4 (finally).
  buf = ALPHABET[Number(genes)] + buf

  // Pad with leading 0s.
  buf = buf.padStart(48, '1')

  return buf.replace(/(.{4})/g, '$1 ')
}

function convertGenes(_genes, genesMap) {
  // First, convert the genes to kai.
  const rawKai = genesToKai(BigInt(_genes.toString()))
    .split(' ')
    .join('')

  const genes = {}

  // Remove spaces, and get every 4th character.
  for (const k in rawKai.split('')) {
    if (rawKai.hasOwnProperty(k)) {
      const trait = genesMap[Math.floor(Number(k) / 4)]

      const kai = rawKai[k]
      const valueNum = kai2dec(kai)

      genes[trait] = choices[trait][valueNum]
    }
  }

  return genes
}
// --

const bestStatsForProfession = {
  "mining": ["STR","END"],
  "fishing": ["AGI", "LCK"],
  "gardening": ["WIS","VIT"],
  "foraging": ["DEX", "INT"]
}

const bestClassesForProfession = {
  "mining": ["warrior","knight","paladin","darkKnight", "dragoon", "dreadKnight", "berserker"],
  "fishing": ["thief", "ninja", "sage", "shapeshifter"],
  "gardening": ["priest","wizard","summoner","paladin", "sage", "seer"],
  "foraging": ["archer", "ninja", "darkKnight", "summoner", "sage"]
}

function getBestProfession(heroattr) {
  let bestProf = heroattr.profession;
  let scoreProf = 1;
  
  // boost 2
  if (bestStatsForProfession[bestProf].includes(heroattr.statboost2)) scoreProf += 1;
  
  // class
  if (bestClassesForProfession[bestProf].includes(heroattr.class)) scoreProf += 1;
  
  //return [bestProf, scoreProf]
  return scoreProf
}

async function getHeroDetailedInfo(provider, id, chain = "SD") {
  const contract = new ethers.Contract(heroNFT[chain], heroABI, provider);
  
  //const owner = await contract.ownerOf(id);
  //console.log("Owner", owner);
  
  const iface = new ethers.utils.Interface(heroABI);
  var out = await provider.call({
      to: heroNFT[chain],
      data: ethers.utils.hexConcat([
        iface.getSighash("getHero(uint256)"),
        ethers.utils.defaultAbiCoder.encode(['uint256'], [id])
      ])
  });
  out = out.toString()
  
  let amount, i;
  let heroattr = {}
  
  i = 5;  // free summons
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.freesummons = BigNumber.from(amount).toNumber()
  
  i = 6;  // max summons
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.maxsummons = BigNumber.from(amount).toNumber()
  
  i = 7;  // statGenes
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  const statGenes = convertGenes(BigNumber.from(amount), statsGenesMap)
  heroattr.class = statGenes.class
  heroattr.subclass = statGenes.subClass
  heroattr.element = statGenes.element
  heroattr.profession = statGenes.profession
  heroattr.statboost1 = statGenes.statBoost1
  heroattr.statboost2 = statGenes.statBoost2
  
  i = 8;  // visualGenes
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  const visualGenes = convertGenes(BigNumber.from(amount), visualGenesMap)
  heroattr.background = visualGenes.background
  heroattr.gender = visualGenes.gender
  
  i = 9;  // rarity
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.rarity = rarityLevels[BigNumber.from(amount).toNumber()]
  
  i = 10;  // shiny
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.shiny = BigNumber.from(amount).toNumber()
  
  i = 11;  // generation
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.generation = BigNumber.from(amount).toNumber()
  
  i = 20;  // level
  amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
  heroattr.level = BigNumber.from(amount).toNumber()
  
  // average stats
  let partial = 0;
  for (i=25; i<=32; i++) {  // sum the 8 stats
    amount = ethers.utils.hexDataSlice(out, i*32, i*32 + 32);
    partial = BigNumber.from(amount).toNumber() + partial;
  }
  heroattr.statavg = partial/8
  
  // profession score
  heroattr.scoreprof = getBestProfession(heroattr)
  
  // PJ survivor  -- TODO, now in CV all false => use different provider in order to catch them, or use a locally saved list
  let isSurvivor = false;
  if (chain === "SD") isSurvivor = await getPJSurvivor(provider, id);
  heroattr.ispj = isSurvivor;
  
  return heroattr
}

async function getPJSurvivor(provider, id) {
  const targetAddr = '0xE92Db3bb6E4B21a8b9123e7FdAdD887133C64bb7'
  const data = ethers.utils.hexConcat([
    '0xb8409d47',
    ethers.utils.defaultAbiCoder.encode(
        ['uint256'], [id]
    )
  ])
  
  let result = await provider.call({
    to: targetAddr,
    data: data
  })
  result = BigNumber.from(result).toNumber();
  return (result !== 0)
}

module.exports = {
  getHeroDetailedInfo
};