const {
  getConnectionDetails,
  forceConnectionReset,
  sequelize
} = require('./config/database');
const { getActiveUserCount } = require('./middleware/sessionManager');

async function testConnectionCleanup() {
  console.log('=== Database Connection Cleanup Test ===\n');
  
  try {
    // Test 1: Get initial connection status
    console.log('1. Initial connection status:');
    const initialStatus = await getConnectionDetails();
    console.log(JSON.stringify(initialStatus, null, 2));
    
    // Test 2: Create a database connection by authenticating
    console.log('\n2. Creating database connection...');
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Test 3: Get connection status after authentication
    console.log('\n3. Connection status after authentication:');
    const afterAuthStatus = await getConnectionDetails();
    console.log(JSON.stringify(afterAuthStatus, null, 2));
    
    // Test 4: Force connection reset
    console.log('\n4. Force resetting connection pool...');
    const resetResult = await forceConnectionReset();
    console.log(`Connection reset result: ${resetResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Test 5: Get connection status after reset
    console.log('\n5. Connection status after reset:');
    const afterResetStatus = await getConnectionDetails();
    console.log(JSON.stringify(afterResetStatus, null, 2));
    
    // Test 6: Test active user count
    console.log('\n6. Active user count:');
    const userCount = getActiveUserCount();
    console.log(`Active users: ${userCount}`);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Ensure cleanup
    try {
      await forceConnectionReset();
      console.log('Final cleanup completed');
    } catch (error) {
      console.error('Final cleanup failed:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  testConnectionCleanup().then(() => {
    console.log('Test script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

module.exports = { testConnectionCleanup };