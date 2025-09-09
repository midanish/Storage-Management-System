const sequelize = require('../config/database');
const User = require('./User');
const Item = require('./Item');
const BorrowHistory = require('./BorrowHistory');

// User to BorrowHistory relationship
User.hasMany(BorrowHistory, {
  foreignKey: 'user_id',
  as: 'borrowHistory',
});

BorrowHistory.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'borrower',
});

// Note: No direct foreign key relationship between Item and BorrowHistory
// since the Item table (firewall_samples) doesn't have a primary key
// We'll handle the relationship through cabinet_location and package_code

module.exports = {
  sequelize,
  User,
  Item,
  BorrowHistory,
};