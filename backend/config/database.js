const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Set Google DNS servers
/**
 * MongoDB Connection Configuration
 * Reads connection URI from environment variable MONGO_URI
 * Implements proper error handling and connection events
 */
const connectDB = async () => {
  try {
    // Read MongoDB URI from environment variable
    const mongoURI = process.env.MONGO_URI;



    if (!mongoURI) {
      console.error('❌ MONGO_URI environment variable is not defined');
      console.warn('⚠️  Please set MONGO_URI in your .env file');
      console.warn('⚠️  Example: MONGO_URI=mongodb://127.0.0.1:27017/vote-db');
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Connection options for mongoose
    const options = {
      maxPoolSize: 10,           // Maximum number of sockets in the connection pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000,    // Socket timeout
      family: 4                  // Use IPv4
    };

    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);

    return mongoose.connection;

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Make sure MongoDB server is running on the specified host and port');
    }

    if (error.message.includes('authentication failed')) {
      console.error('💡 Check your MongoDB username and password');
    }

    // Don't exit process, allow server to continue without DB (with warnings)
    console.warn('⚠️  Server will continue without database connection');
    console.warn('⚠️  Some features may not work properly');

    return null;
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected successfully');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

module.exports = connectDB;
