const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS]} );
const fs = require('fs');
require('dotenv').config();
const wait = require('util').promisify(setTimeout);

// copied from the docs
// used to initialize all the custom commands for the guild

// get all command.js files
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// convert command data to required json format
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

client.once('ready', () =>{
	const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
	const CLIENT_ID = client.user.id;
	// initialize commands
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

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'ping') {
		// send the latency and the API latency
		await interaction.reply(`Pong back at you with a latency of ${(Date.now() - interaction.createdTimestamp)} ms! (API latency ${Math.round(client.ws.ping)} ms)`);
	}

	// a command that changes your roles based on slash command choices
	if (interaction.commandName === 'select') {
		const paddle_color = interaction.options.getString('type');
		// find the correct paddle emoji based on the user's selection
		const paddle_emoji = client.emojis.cache.find(emoji => emoji.name === `ping_pong_${paddle_color}`);
		// let the user know what paddle they chose
		await interaction.reply({ content: `You chose a ${paddle_color} paddle ${paddle_emoji}`, ephemeral: true });
		// find the correct role based on user's selection
		let role = interaction.guild.roles.cache.find(role => role.name === paddle_color);
		// replace all roles with just the correct one
		interaction.member.roles.set([role]);
	}

	if (interaction.commandName === 'play') {
		if (interaction.member.roles.cache.some(role => role.name === 'red') ||
			interaction.member.roles.cache.some(role => role.name === 'green') ||
			interaction.member.roles.cache.some(role => role.name === 'blue'))
		{
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

			interaction.reply({ content: 'Easy (slow) or Hard (fast)?!', components: [row] });

			const filter = click => click.customId === 'easy_btn' || click.customId === 'hard_btn';
			const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
			
			let easy = true;
			collector.on('collect', async response => {
				if (response.customId === 'easy_btn') {
					await response.update({ content: ':relaxed: Easy mode selected! :relaxed:', components: [] });
				} else if (response.customId === 'hard_btn') {
					await response.update({ content: ':open_mouth: Hard mode selected! :open_mouth:', components: [] });
					easy = false;
				}
			})

			const speed = (easy) ? 1 : 2;
			await interaction.channel.send('Ready...');
			await wait(2000);
			await interaction.channel.send('Set...');
			await wait(1500);
			await interaction.channel.send('Go!');
			await wait(500);
		} else
		{
			await interaction.reply("You haven't select a paddle yet! Use `/select` to choose your color");
		}
	}
});

client.login(process.env.TOKEN);