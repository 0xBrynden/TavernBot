const { BigNumber } = require("ethers")
require('dotenv').config();


function numberOfGems(price, chain) {
    const n = Math.floor(Math.sqrt(parseInt(price))/7)+1
    if (chain === "CV") {
        return "\u{1F48E}".repeat(n)  // TODO \u{1F4A0} 1F537
    } else {
        return "\u{1F48E}".repeat(n)  // \u{1F48E} 1F3F5 1F536
    }
}

function chooseRarColor(rar) {
    if (rar === 'common') return "\u{26AA}"
    if (rar === 'uncommon') return "\u{1F7E2}"
    if (rar === 'rare') return "\u{1F535}"
    if (rar === 'legendary') return "\u{1F7E1}"
    if (rar === 'mythic') return "\u{1F7E3}"
    return ""
}

function getSummons(heroattr) {
    if (heroattr.generation === 0) return "\u{221E} summons"
    let usedsum = heroattr.maxsummons - heroattr.freesummons
    return usedsum + "/" + heroattr.maxsummons + " summons"
}

function getProfessionEmote(prof, score) {
    if(prof === "foraging") return "\u{1F33F}".repeat(score)
    if(prof === "gardening") return "\u{1F33B}".repeat(score)
    if(prof === "mining") return "\u{26CF}".repeat(score)
    if(prof === "fishing") return "\u{1F3A3}".repeat(score)
}

function getExtra(heroattr) {
    let extra = "";
    if (heroattr.generation === 0) extra += " \u{1F3C6}"
    if (heroattr.class === "dragoon") extra += " \u{1F40E}"
    if (heroattr.class === "ninja") extra += " \u{1F977}"
    if (heroattr.class === "sage") extra += " \u{1F52E}"
    if (heroattr.class === "dreadKnight") extra += " \u{2694}"
    if (heroattr.class === "summoner") extra += " \u{1F9D9}"
    if (heroattr.class === "paladin") extra += " \u{1F5E1}"
    if (heroattr.class === "darkKnight") extra += " 🐈‍⬛" // 1F408 200D 2B1B
    if (heroattr.class === "shapeshifter") extra += " \u{1F3AD}" // 1F978 1F9B8 1F98B 
    if (heroattr.shiny === 1) extra += " \u{1F31F}"
    if (heroattr.ispj === true) extra += " \u{26F5}"
    return extra
}

function getHeroNumber(heroId) {
    const TRILLION = BigNumber.from("1000000000000")
    if (BigNumber.from(heroId).gt(TRILLION)) {
        return `\u{1F537}${BigNumber.from(heroId).sub(TRILLION).toString()}`
    } else {
        return `\u{1F536}${heroId}`
    }
}

function getChainName(chain) {
    if (chain == 'CV') {
        return 'Crystalvale'
    } else {
        return 'Serendale'
    }
}

async function newAuctionMessageT(
    bot,
    recipients,
    heroId,
    price,
    heroattr,
    chain,
) {
    let gems = numberOfGems(price, chain);

    let color = chooseRarColor(heroattr.rarity);
    
    let profEmote = getProfessionEmote(heroattr.profession, heroattr.scoreprof)
    
    let extra = getExtra(heroattr)
    
    let heroNumber = getHeroNumber(heroId)
    
    let chainName = getChainName(chain)
    
    let longmsg;
    longmsg = 
        "\u{1F195} " + heroNumber + ` on ${chainName}` + "\n" +
        "gen " + heroattr.generation + " " + color + "  |  " + getSummons(heroattr) + "  |  " + "lvl " + heroattr.level + "\n" +
        heroattr.class + " " + heroattr.subclass + "  " + extra + "\n" +
        heroattr.profession + " - " + heroattr.statboost1 + " " + heroattr.statboost2 + " " + profEmote + "\n" + 
        "Price: " + price + " " + gems    

              
  
    for (let i=0; i<recipients.length; i++) {
        try {
            bot.sendMessage(recipients[i], longmsg).catch(err => {});
        } catch {}
    }
}

async function auctionEndedMessageT(
    bot,
    recipients,
    heroId,
    price,
    heroattr,
    chain,
) {
    let gems = numberOfGems(price, chain);
    
    let color = chooseRarColor(heroattr.rarity);
    
    let profEmote = getProfessionEmote(heroattr.profession, heroattr.scoreprof)
    
    let extra = getExtra(heroattr);
    
    let heroNumber = getHeroNumber(heroId)
    
    let chainName = getChainName(chain)
    
    let longmsg;
    longmsg = 
        "\u{1F6AB} Buy Order: " + heroNumber + ` on ${chainName}` + "\n" +
        "gen " + heroattr.generation + " " + color + "  |  " + getSummons(heroattr) + "  |  " + "lvl " + heroattr.level + "\n" +
        heroattr.class + " " + heroattr.subclass + "  " + extra + "\n" +
        heroattr.profession + " - " + heroattr.statboost1 + " " + heroattr.statboost2 + " " + profEmote + "\n" + 
        "Bought for: " + price + " " + gems 
    
    for (let i=0; i<recipients.length; i++) {
        try {
            bot.sendMessage(recipients[i], longmsg).catch(err => {});
        } catch {}
    }
}

async function statsMessageT(
    bot,
    stats
) {
    
    const rarityLevels = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
    
    // average prices
    let price = [0,0,0,0,0]
    let totPrice, totCount;
    let tottotCount = 0;
    for (let gg=0; gg<5; gg++) {
        totPrice = 0;
        totCount = 0;
        for(let i=0; i<5; i++) {
            totPrice += stats[gg][rarityLevels[i]]['totPrice']
            totCount += stats[gg][rarityLevels[i]]['totCount']
        }
        price[gg] = Math.round(totPrice/totCount)
        tottotCount += totCount
    }
    
    const msg = 
        "```\n" +
        "\u{1F37B} Tavern Daily Stats \u{1F37B}\n" +
        "Total Heroes Traded: " + tottotCount + "\n" + // \u{1F451} corona
        "Average Prices:\n" +
        "Gen 0 - " + price[0].toString().padStart(5,' ') + " \u{1F48E}\u{1F48E}\u{1F48E}\n" +
        "Gen 1 - " + price[1].toString().padStart(5,' ') + " \u{1F48E}\u{1F48E}\n" +
        "Gen 2 - " + price[2].toString().padStart(5,' ') + " \u{1F48E}\n" +
        "Gen 3 - " + price[3].toString().padStart(5,' ') + " \u{1F48E}\n" +
        "Gen 4 - " + price[4].toString().padStart(5,' ') + " \u{1F48E}\n" +
        "```\n"
    
    bot.sendMessage(CHANNELID, msg, {parse_mode: 'Markdown'});
}


module.exports = {
    newAuctionMessageT,
    auctionEndedMessageT,
    statsMessageT
};

