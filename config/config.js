module.exports = {
    app: {
      name: 'Diecut Management API',
      version: '1.0.0',
      env: process.env.NODE_ENV || 'development',
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    paths: {
      // Converting paths from the C# application
      diecutPath: process.env.DIECUT_PATH || './uploads/diecut',
      embossingPath: process.env.PUMP_SWELL_PATH || './uploads/embossing',
      hotStampingPath: process.env.HOT_STAMP_PATH || './uploads/hot-stamping'
    },
    sqlTableIds: {
      // Converting SQL table IDs from the Global.cs file
      SQLTAB_GET_VERSION: 700120006,
      SQLTAB_GET_COMPANYDATABASE: 700120008,
      SQLTAB_GET_DIECUT: 700450001,
      SQLTAB_GET_MAT: 700450002,
      SQLTAB_GET_LIST_MAT: 700450003,
      SQLTAB_GET_LIST_MODIFY_DIECUT: 700450004,
      SQLTAB_GET_SN: 700720014,
      SQLTAB_GET_DIECUT_AND_PROD: 700450005,
      SQLTAB_GET_MASTER_MULTI_BLADE_REASON: 700720016,
      SQLTAB_GET_006: 700450006
    }
  };