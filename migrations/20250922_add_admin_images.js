const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Questions', 'admin_images', {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        });

        await queryInterface.addColumn('Questions', 'enable_admin_images', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Questions', 'admin_images');
        await queryInterface.removeColumn('Questions', 'enable_admin_images');
    }
};