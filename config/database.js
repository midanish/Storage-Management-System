const { Sequelize } = require('sequelize');

let sequelize = null;

function getSequelizeInstance() {
  if (!sequelize) {
    sequelize = new Sequelize(
      'Storage_atomicdig',
      'Storage_atomicdig',
      'e7deb901d0a82bf0ed7b3089fa64a842e7b479d7',
      {
        host: '25w29u.h.filess.io',
        port: 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        dialectOptions: {
          connectTimeout: 60000,
          ssl: false
        },
        pool: {
          max: 1,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );
  }
  return sequelize;
}

module.exports = getSequelizeInstance();