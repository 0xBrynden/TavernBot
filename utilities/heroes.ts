import { BigNumber } from 'ethers'

import { getFullName } from '../components/_DeFiKingdoms/_helpers/names'
import { ZERO_ADDRESS } from '../constants'
import { DateTime } from 'luxon'

const choices: { [index: string]: any } = {
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
    16: 'paladin',
    17: 'darkKnight',
    18: 'summoner',
    19: 'ninja',
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
    16: 'paladin',
    17: 'darkKnight',
    18: 'summoner',
    19: 'ninja',
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

// To do this, we need to map each section of the gene string to a key.
const visualGenesMap: { [index: number]: string } = {
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

const statsGenesMap: { [index: number]: string } = {
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

function kai2dec(kai: string) {
  const ALPHABET = '123456789abcdefghijkmnopqrstuvwx'
  return ALPHABET.indexOf(kai)
}

function genesToKai(genes: bigint) {
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

function convertGenes(_genes: BigNumber, genesMap: { [index: number]: string }) {
  // First, convert the genes to kai.
  const rawKai = genesToKai(BigInt(_genes.toString()))
    .split(' ')
    .join('')

  const genes: { [index: string]: any } = {}

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

/**
 * Returns a hero object the way the game likes it.
 */
export default function buildHero(heroRaw: any, owner: any) {
  const rarityLevels = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
  const visualGenes = convertGenes(heroRaw.info.visualGenes, visualGenesMap)
  const statGenes = convertGenes(heroRaw.info.statGenes, statsGenesMap)
  return {
    ownerName: owner._name,
    ownerHash: owner._owner,
    ownerPortrait: owner._picId,
    background: visualGenes.background,
    class: statGenes.class,
    subClass: statGenes.subClass,
    classType: 'basic',
    element: statGenes.element,
    gender: visualGenes.gender,
    generation: heroRaw.info.generation,
    id: heroRaw.id.toNumber(),
    heroId: heroRaw.id.toNumber(),
    summonerId: heroRaw.summoningInfo.summonerId,
    assistantId: heroRaw.summoningInfo.assistantId,
    isQuesting: heroRaw.state.currentQuest != ZERO_ADDRESS,
    xp: heroRaw.state.xp.toNumber(),
    level: heroRaw.state.level,
    name: getFullName(visualGenes.gender, heroRaw.info.firstName, heroRaw.info.lastName),
    rarity: rarityLevels[heroRaw.info.rarity],
    rarityNum: heroRaw.info.rarity,
    shiny: heroRaw.info.shiny,
    shinyStyle: heroRaw.info.shiny ? heroRaw.info.shinyStyle : 0,
    staminaFullAt: DateTime.fromSeconds(heroRaw.state.staminaFullAt.toNumber()),
    summonedDate: DateTime.fromSeconds(heroRaw.summoningInfo.summonedTime.toNumber()),
    nextSummonTime: DateTime.fromSeconds(heroRaw.summoningInfo.nextSummonTime.toNumber()),
    summons: heroRaw.summoningInfo.summons,
    maxSummons: heroRaw.summoningInfo.maxSummons,
    price: 0,
    summoningPrice: 0,
    stats: {
      strength: heroRaw.stats.strength,
      intelligence: heroRaw.stats.intelligence,
      wisdom: heroRaw.stats.wisdom,
      luck: heroRaw.stats.luck,
      agility: heroRaw.stats.agility,
      vitality: heroRaw.stats.vitality,
      endurance: heroRaw.stats.endurance,
      dexterity: heroRaw.stats.dexterity,
      hp: heroRaw.stats.hp,
      mp: heroRaw.stats.mp,
      stamina: heroRaw.stats.stamina
    },
    visualGenes: visualGenes,
    visual: {
      ...visualGenes,
      shiny: heroRaw.info.shiny,
      shinyStyle: heroRaw.info.shiny ? heroRaw.info.shinyStyle : 0
    },
    statGenes: statGenes,
    skills: {
      mining: 0,
      gardening: 0,
      fishing: 0,
      foraging: 0
    }
  }
}
