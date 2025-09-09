const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Item = sequelize.define('Item', {
  // Explicitly define the identifying columns since there's no id field
  Packagecode: {
    type: DataTypes.STRING(255),
    allowNull: true,
    // This is part of the composite key
  },
  Packagedescription: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  'Temporary Cabinet': {
    type: DataTypes.STRING(255),
    allowNull: true,
    // This is the primary identifier for the cabinet
    primaryKey: true, // Explicitly mark as primary key
  },
  Category: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  'SampleCreatedByShift(A/B/C)': {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  'MATERIAL AT ENG ROOM': {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  Dummyunit: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  // Substrate defects
  'WhiteFM(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'BlackFM(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Chip(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Scratches(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Crack(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'FMonFoot(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'FMonShoulder(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'NFA(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'PFA(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Footburr(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Shoulderbur(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Exposecopper(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Resinbleed(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'void(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  'Copla(Substrate)': { type: DataTypes.STRING(255), allowNull: true },
  // Mold/MetalLid defects
  'WhiteFM(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'BlackFM(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'EdgeChip(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'CornerChip(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'Scratches(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'Crack(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  'Illegiblemarking(Mold/MetalLid)': { type: DataTypes.STRING(255), allowNull: true },
  // Die defects
  'WhiteFM(Die)': { type: DataTypes.STRING(255), allowNull: true },
  'BlackFM(Die)': { type: DataTypes.STRING(255), allowNull: true },
  'Chip(Die)': { type: DataTypes.STRING(255), allowNull: true },
  'Scratches(Die)': { type: DataTypes.STRING(255), allowNull: true },
  'Crack(Die)': { type: DataTypes.STRING(255), allowNull: true },
  // Bottom defects
  'WhiteFM(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  'BlackFM(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  'Chip(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  'Scratches(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  'Crack(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  'Damageball(BottomDefect)': { type: DataTypes.STRING(255), allowNull: true },
  // Other defects
  'Multiple Defect': { type: DataTypes.STRING(255), allowNull: true },
  Pitch: { type: DataTypes.STRING(255), allowNull: true },
  Sliver: { type: DataTypes.STRING(255), allowNull: true },
  'Ball Discoloration': { type: DataTypes.STRING(255), allowNull: true },
  Burr: { type: DataTypes.STRING(255), allowNull: true },
  'FM on Dambar': { type: DataTypes.STRING(255), allowNull: true },
  'FM on Lead': { type: DataTypes.STRING(255), allowNull: true },
  'Expose Copper on Dambar': { type: DataTypes.STRING(255), allowNull: true },
  'Mold Flash': { type: DataTypes.STRING(255), allowNull: true },
  'Metallic Particle': { type: DataTypes.STRING(255), allowNull: true },
  Patchback: { type: DataTypes.STRING(255), allowNull: true },
  'Bent Lead': { type: DataTypes.STRING(255), allowNull: true },
  'Expose Tie Bar': { type: DataTypes.STRING(255), allowNull: true },
  Fiber: { type: DataTypes.STRING(255), allowNull: true },
  'Tool Mark': { type: DataTypes.STRING(255), allowNull: true },
  'Good Unit': { type: DataTypes.STRING(255), allowNull: true },
  'Lead Shining': { type: DataTypes.STRING(255), allowNull: true },
  'Acid Test Burr': { type: DataTypes.STRING(255), allowNull: true },
  TotalSample: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'firewall_samples',
  timestamps: false,
  // Disable Sequelize's default id assumption
  hasPrimaryKeys: true, // We have defined primary keys
  // Don't add an id field automatically
  omitNull: false,
  // Define the actual primary key
  primaryKey: 'Temporary Cabinet',
});

module.exports = Item;