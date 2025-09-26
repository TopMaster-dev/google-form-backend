module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('responses', 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('responses', 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });
    }
};