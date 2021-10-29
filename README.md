# **Discord Ping Pong Bot**
A basic Discord.js bot that can ping back, assign roles, and play a mini-game with the player.
## Commands
`/ping`

Will ping the bot to get a basic response but also provide instructions on how to start the game.

`/select`

Will allow the user to select a color role that changes provides some cosmetic changes in game.

*Note: Read below for information on setting up the server.*

---
Assigning roles is based on role name. The bot requires the server to have 3 roles with the following names based on the possible color options:
```
- red
- blue
- green
```
The ping pong paddle emojis are also custom so importing the bot to another server also requires emojis with the following names:
```
- ping_pong_yellow
- ping_pong_red
- ping_pong_blue
- pong_pong_green
```
---
`/play`

Initiates the ping pong game with the bot with two difficulty levels that change the speed at which the game is played.