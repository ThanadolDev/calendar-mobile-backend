const oracledb = require('oracledb');
require('dotenv').config({ path: `./.env.dev` });
oracledb.initOracleClient();

const dbConfigDevelopment  = {
    user: process.env.DB_USER_KPRAUD,
    password: process.env.DB_PASSWORD_KPRAUD,
    connectString: process.env.DB_CONNECT_STRING_KPRAUD
};

function getDbConfig(dblocate) {
  dblocate = dblocate || 'KPRAUD';

  if (dblocate) {
    return {
      user: process.env['DB_USER_' + dblocate],
      password: process.env['DB_PASSWORD_' + dblocate],
      connectString: process.env['DB_CONNECT_STRING_' + dblocate]
    };
  } else {
    return {
      user: process.env.DB_USER_KPRAUD,
      password: process.env.DB_PASSWORD_KPRAUD,
      connectString: process.env.DB_CONNECT_STRING_KPRAUD
    };
  }
}

async function connectToDatabase(dblocate) {
  // const dbConfig = getDbConfig(dblocate);
  const dbConfig = {
    user: process.env.DB_USER_KPRAUD,
    password: process.env.DB_PASSWORD_KPRAUD,
    connectString: process.env.DB_CONNECT_STRING_KPRAUD
  }
  console.log(dbConfig)
    try {
      const connection = await oracledb.getConnection(dbConfig); 
      return connection;
    } catch (error) {
      throw new Error(error);
    }
  }
  
module.exports = {
  connectToDatabase,
};