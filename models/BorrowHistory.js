const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BorrowHistory = sequelize.define('BorrowHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cabinet_location: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  package_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  borrowed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  due_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  returned_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  return_status: {
    type: DataTypes.ENUM('Borrowed', 'In Progress', 'Returned'),
    allowNull: false,
    defaultValue: 'Borrowed',
  },
  expected_samples: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  returned_samples: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  justification: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  admin_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  admin_comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reminder_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'borrow_history',
  timestamps: false, // We're managing timestamps manually
});

module.exports = BorrowHistory;