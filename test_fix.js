const { Item } = require('./models');

async function testItemModel() {
  console.log('=== TESTING ITEM MODEL FIX ===');
  
  try {
    // Test 1: Check model configuration
    console.log('\n1. Model Configuration:');
    console.log('Primary key attribute:', Item.primaryKeyAttribute);
    console.log('Table name:', Item.tableName);
    console.log('Raw attributes:', Object.keys(Item.rawAttributes));
    console.log('Model options:', {
      primaryKey: Item.options.primaryKey,
      tableName: Item.options.tableName,
      timestamps: Item.options.timestamps
    });

    // Test 2: Simple query with specific attributes (should work)
    console.log('\n2. Testing query with specific attributes...');
    const results1 = await Item.findAll({
      where: { Category: 'Available Cabinet' },
      attributes: ['Temporary Cabinet', 'Category', 'MATERIAL AT ENG ROOM'],
      limit: 2,
      raw: true,
      logging: (sql) => console.log('SQL:', sql)
    });
    console.log('✓ Query with specific attributes successful!');
    console.log('Results count:', results1.length);

    // Test 3: Query without specifying attributes (this might fail)
    console.log('\n3. Testing query without specific attributes...');
    try {
      const results2 = await Item.findAll({
        where: { Category: 'Available Cabinet' },
        limit: 1,
        raw: true,
        logging: (sql) => console.log('SQL:', sql)
      });
      console.log('✓ Query without specific attributes successful!');
      console.log('Results count:', results2.length);
    } catch (err) {
      console.log('✗ Query without specific attributes failed:', err.message);
      if (err.sql) console.log('Failed SQL:', err.sql);
    }

    // Test 4: Test the specific failing query from the error
    console.log('\n4. Testing the specific failing query pattern...');
    try {
      const results3 = await Item.findAll({
        where: {
          Category: 'Available Cabinet',
          'MATERIAL AT ENG ROOM': 'YES'
        },
        raw: true,
        logging: (sql) => console.log('SQL:', sql)
      });
      console.log('✓ Specific failing query pattern successful!');
      console.log('Results count:', results3.length);
    } catch (err) {
      console.log('✗ Specific failing query pattern failed:', err.message);
      if (err.sql) console.log('Failed SQL:', err.sql);
    }

    console.log('\n=== TEST COMPLETED ===');

  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      sql: error.sql,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
}

testItemModel();