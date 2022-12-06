## Defikingdoms Tavern Bot
Telegram bot that streams live orders from the Tavern.


## How to install
1) Install packages
```sh
yarn
```

2) Prepare a telegram bot using the official Telegram app: 
- Chat with @BotFather and create a bot (/newbot). Save the token it gives you, you'll need it to send messages.
- Set the list of commands for the bot (/setcommands):
```
newfilter - add filter
removefilter - remove filter
showmyfilters - see filters
menu - see the menu
legend - see emojis legend
update - see latest update
help - see help
```

3) Make a `.env` file with all the info
```sh
cp .env.example .env
```
What you need is:
- `TELEGRAM_TOKEN`: the token @BotFather gave you during the bot creation.
- `TELEGRAM_CHANNEL`: the ID of the bot; it's the number at the end of the URL for the bot when using telegram on the browser, for example if the URL is https://web.telegram.org/z/#2089395499, then `TELEGRAM_CHANNEL = 2089395499`; it should be also the first part of TELEGRAM_TOKEN.
- `DEV_CHAT_ID`: your personal channel ID, you have a special command to broadcast messages (`/broadcast blablabla` will send everyone `blablabla`).
- `HTTP_URLS_HARMONY`, `HTTP_URLS_DFK`: all RPC endpoints for the blockchains.
- `S3_BUCKET`: AWS S3 bucket name, used to save users' filters.


## How to run
```sh
node main.js
```

## How it works

The bot listens to events (logs) emitted from the blockchains (harmony and dfkchain for now). From the logs it takes all info related to the Tavern order.
The it loops over all users' filters, matching their preferences. At the end it sends a Telegram message to the matching ones.

The users' filters are seved in a .json file. The bot currently tries to store it in a AWS S3 bucket, but it can easily be changed to store it locally or in another server.

The DFK API was not used, every hero data is taken from the blockchain. This worked well in the past when the API was continuesly lagging, while the blockchain worked pretty well (of course it depends from the RPC, I found pokt the best).