const app = require('./src/app');
const { sequelize, User } = require('./models');
require('./config/scheduler');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function initializeAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn('Admin email not configured in environment variables');
      return;
    }

    // Check if admin user exists in database
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      console.log(`Admin user verified in database: ${adminEmail}`);
    } else {
      console.warn(`Admin user not found in database for email: ${adminEmail}`);
      console.warn('Please ensure admin user exists in database or set ADMIN_PASSWORD in .env to create one');
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ force: false });
    console.log('Database synchronized.');

    // Initialize admin user
    await initializeAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();