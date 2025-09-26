module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Questions', 'placeholder', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Questions', 'placeholder');
    }
};