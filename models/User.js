const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
    "User",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, unique: true, allowNull: false },
        password: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.ENUM("admin", "user"), defaultValue: "user" },
    },
    {
        // Enable automatic mapping for `createdAt` and `updatedAt` columns to `created_at` and `updated_at` in the DB
        timestamps: true,
        underscored: true,  // Maps camelCase to snake_case in the database
    }
);

module.exports = User;
