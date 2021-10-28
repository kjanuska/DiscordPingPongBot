const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('select')
        .setDescription('Select the type of paddle you want')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choose your paddle type')
                .setRequired(true)
                .addChoice('red', 'red')
                .addChoice('green', 'green')
                .addChoice('blue', 'blue'))
};