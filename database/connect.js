const mongoose = require('mongoose');

let isConnected = false;

async function connectDB(mongoUri) {
  if (isConnected) {
    return mongoose.connection;
  }
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to initialize database connection.');
  }
  const db = await mongoose.connect(mongoUri, {
    bufferCommands: false,
  });
  isConnected = db.connections[0].readyState === 1;
  console.log('MongoDB Connected Successfully: Omnix Sophia CRM');
  return db;
}

module.exports = { connectDB };
