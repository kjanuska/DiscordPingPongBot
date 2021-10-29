// required Discord libraries
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS]} );
const fs = require('fs');
// used for the .env file
require('dotenv').config();
// custom function to create timeouts
const wait = require('util').promisify(setTimeout);

// copied from the Discord.js docs
// used to initialize all the custom commands for the guild

// get all {command}.js files
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// convert command data to required JSON format and add to command array
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

client.once('ready', () =>{
	const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
	const CLIENT_ID = client.user.id;
	// initialize commands with the API
	(async () => {
		try {
			console.log('Started refreshing application (/) commands.');

			await rest.put(
				Routes.applicationGuildCommands(CLIENT_ID, process.env.GUILD_ID),
				{ body: commands },
			);

			console.log('Successfully reloaded application (/) commands.');
		} catch (error) {
			console.error(error);
		}
	})();
});

let paddle_emoji;
let pinged = false;
client.on('interactionCreate', async interaction => {
	// don't care about other types of interactions besides slash commands and buttons
	if (!interaction.isCommand() && !interaction.isButton()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
		await wait(1500);
		await interaction.channel.send('Do you want to play a game? Type `/select` to select your paddle and `/play` to get started');
	}

	// a command that changes your roles based on slash command choices
	if (interaction.commandName === 'select') {
		const paddle_color = interaction.options.getString('type');
		// find the correct paddle emoji based on the user's selection
		paddle_emoji = client.emojis.cache.find(emoji => emoji.name === `ping_pong_${paddle_color}`);
		// let the user know what paddle they chose
		await interaction.reply({ content: `You chose a ${paddle_color} paddle ${paddle_emoji}`, ephemeral: true });
		// find the correct role based on user's selection
		let role = interaction.guild.roles.cache.find(role => role.name === paddle_color);
		// replace all roles with just the correct one
		interaction.member.roles.set([role]);
	}

	if (interaction.commandName === 'play') {
		// check to make sure that the user has a valid role
		if (interaction.member.roles.cache.some(role => role.name === 'red') ||
			interaction.member.roles.cache.some(role => role.name === 'green') ||
			interaction.member.roles.cache.some(role => role.name === 'blue'))
		{
			// create difficulty buttons
			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId('easy_btn')
						.setLabel('Easy')
						.setStyle('SUCCESS'),
					new MessageButton()
						.setCustomId('hard_btn')
						.setLabel('Hard')
						.setStyle('DANGER'),
				);

			interaction.reply({ content: 'Easy or Hard?!', components: [row] });
		} else
		{
			// the user needs to select a valid role before playing the game
			await interaction.reply("You haven't select a paddle yet! Use `/select` to choose your color");
		}
	}

	// limit interactions to difficulty selectors
	if (interaction.isButton() && (interaction.customId === 'easy_btn' || interaction.customId === "hard_btn")) {
		// the speed at which the ball travels across the field
		let increment = 10;
		if (interaction.customId === 'easy_btn') {
			await interaction.update({ content: ':relaxed: Easy mode selected! :relaxed:', components: [] });
		} else if (interaction.customId === 'hard_btn') {
			// faster ball travel
			increment = 25;
			await interaction.update({ content: ':open_mouth: Hard mode selected! :open_mouth:', components: [] });
		}
		// countdown timer
		await wait(500);
		await interaction.channel.send('Ready...');
		await wait(1500);
		await interaction.channel.send('Set...');
		await wait(1000);
		await interaction.channel.send('Go!');
		await wait(500);

		// create a button the user will use to play the game
		const row = new MessageActionRow()
		.addComponents(
			new MessageButton()
				.setCustomId('ping_btn')
				.setStyle('SECONDARY')
				.setEmoji(paddle_emoji),
		);
		// set the bot's paddle emoji
		const bot_emoji = client.emojis.cache.find(emoji => emoji.name === `ping_pong_yellow`);
		// hardcoded field string
		let field = '•⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀';
		await interaction.channel.send({ content: `${bot_emoji} \`${field}\` ${paddle_emoji}`, components: [row] }).then(async (message) => {
			let index = 0;
			let score = 0;
			// every 1.5 seconds update the ball and check game logic
			// 1.5 seconds is chosen to provide enough time for the user's commands to travel to Discord's servers
			let game_loop = setInterval(async () => {
				if (index == 50) {
					// if the ball is at the end of the field wait 250 ms for the user's response
					await wait(250);
					if (pinged) {
						// make the ball go in the opposite direction and increase the bounce score
						index = 50;
						++score;
						increment *= -1;
					}
				// if the ball is at the bot's side of the field make it bounce back
				} else if (index == 0 && increment < 0) {
					increment *= -1;
				}
				// if the ball is at the user's side of the field and the user has not bounced the ball
				// stop the loop, disable game button, and send the score
				if (index == 50 && !pinged) {
					row.components[0].setDisabled(true);
					message.edit({ components: [row] });
					await interaction.channel.send(`Game over! You bounced the ball ${score} ${(score == 1) ? 'time' : 'times'}`);
					clearInterval(game_loop);
				// if the user responded in time continue the game
				} else {
					pinged = false;
					index += increment;
					field = field.replace('•', '⠀');
					field = replaceAtIndex(field, index, '•');
					message.edit(`${bot_emoji}\` ${field}\` ${paddle_emoji}`);
				}
			}, 1500);
		});
	}

	// player bounce button handler
	if (interaction.isButton() && interaction.customId === "ping_btn") {
		// this line is required because Discord expects a reply everytime a button is clicked
		// adding this avoid the "This interaction failed" message everytime the button is pressed
		interaction.deferUpdate();
		pinged = true;
	}
});

// helper function to update the field at a particular string index
function replaceAtIndex(_string,_index,_newValue) {
    split_string = _string.substring(0, _index) + ' ' + _string.substring(_index + 1);
    return_string = split_string.split('');
    return_string[_index] = _newValue;
    return_string = return_string.join('');
    return return_string;
}

// run the bot
client.login(process.env.TOKEN);