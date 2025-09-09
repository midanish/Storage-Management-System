const { Item, User } = require('../models');
const { Op } = require('sequelize');

const registerItem = async (req, res) => {
  try {
    const {
      Packagecode,
      Packagedescription,
      'Temporary Cabinet': cabinetLocation,
      Category,
      'SampleCreatedByShift(A/B/C)': shift,
      TotalSample,
      // All the defect fields
      ...defectCounts
    } = req.body;

    if (!cabinetLocation || !Category || !TotalSample) {
      return res.status(400).json({
        error: 'Cabinet location, category, and total samples are required',
      });
    }

    if (Category === 'Available Cabinet') {
      return res.status(400).json({
        error: 'Cannot register items with category "Available Cabinet"',
      });
    }

    // Check if cabinet location already exists
    const existingItem = await Item.findOne({ 
      where: { 'Temporary Cabinet': cabinetLocation } 
    });
    
    if (existingItem) {
      return res.status(400).json({
        error: 'Item with this cabinet location already exists',
      });
    }

    const itemData = {
      Packagecode: Packagecode || '',
      Packagedescription: Packagedescription || '',
      'Temporary Cabinet': cabinetLocation,
      Category,
      'SampleCreatedByShift(A/B/C)': shift || '',
      'MATERIAL AT ENG ROOM': 'YES',
      'Eng Sample Taken By Email': req.user.email,
      TotalSample: parseInt(TotalSample),
      ...defectCounts
    };

    // Set default values for defect fields
    const defectFields = [
      'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
      'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 
      'PFA(Substrate)', 'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)',
      'Resinbleed(Substrate)', 'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)',
      'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
      'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)',
      'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)', 'Scratches(Die)', 'Crack(Die)',
      'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
      'Crack(BottomDefect)', 'Damageball(BottomDefect)'
    ];

    defectFields.forEach(field => {
      if (itemData[field] === undefined) {
        itemData[field] = '0';
      }
    });

    const item = await Item.create(itemData);

    res.status(201).json({
      message: 'Item registered successfully',
      item: item,
    });
  } catch (error) {
    console.error('Item registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllItems = async (req, res) => {
  try {
    const { category, packagecode, available_only } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (category) {
      whereClause.Category = category;
    }

    if (packagecode) {
      whereClause.Packagecode = packagecode;
    }

    if (available_only === 'true') {
      whereClause['MATERIAL AT ENG ROOM'] = 'YES';
    }

    const { count, rows: items } = await Item.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['TotalSample', 'DESC']],
    });

    res.json({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getItemByLocation = async (req, res) => {
  try {
    const { location } = req.params;

    const item = await Item.findOne({
      where: { 'Temporary Cabinet': location }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Item.findAll({
      attributes: ['Category'],
      group: ['Category'],
      where: {
        Category: {
          [Op.and]: [
            { [Op.ne]: 'Available Cabinet' },
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        },
      },
    });

    res.json({
      categories: categories.map(item => item.Category).filter(cat => cat),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPackageCodes = async (req, res) => {
  try {
    const { category } = req.query;
    const whereClause = {
      Packagecode: {
        [Op.ne]: null,
        [Op.ne]: '',
      },
    };

    if (category) {
      whereClause.Category = category;
    }

    const packageCodes = await Item.findAll({
      attributes: ['Packagecode'],
      group: ['Packagecode'],
      where: whereClause,
    });

    res.json({
      package_codes: packageCodes.map(item => item.Packagecode).filter(code => code),
    });
  } catch (error) {
    console.error('Get package codes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAvailableCabinets = async (req, res) => {
  try {
    const availableCabinets = await Item.findAll({
      where: {
        Category: 'Available Cabinet',
        'MATERIAL AT ENG ROOM': 'YES'
      },
      attributes: ['Temporary Cabinet', 'Packagedescription'],
      order: [['Temporary Cabinet', 'ASC']]
    });

    const cabinets = availableCabinets.map(item => ({
      id: item['Temporary Cabinet'],
      cabinetId: item['Temporary Cabinet'],
      description: item.Packagedescription || 'Available Cabinet'
    }));

    res.json({
      cabinets: cabinets
    });
  } catch (error) {
    console.error('Get available cabinets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const registerItemAutoAssign = async (req, res) => {
  try {
    console.log('=== AUTO-ASSIGN REQUEST STARTED ===');
    console.log('Auto-assign request received:', req.body);
    const newItemData = req.body;

    if (!newItemData.Category || !newItemData.TotalSample) {
      console.log('Missing required fields:', { Category: newItemData.Category, TotalSample: newItemData.TotalSample });
      return res.status(400).json({
        error: 'Category and total samples are required',
      });
    }

    if (newItemData.Category === 'Available Cabinet') {
      return res.status(400).json({
        error: 'Cannot register items with category "Available Cabinet"',
      });
    }

    console.log('Looking for available cabinets...');
    console.log('Item model primary key config:', {
      primaryKey: Item.primaryKeyAttribute,
      rawAttributes: Object.keys(Item.rawAttributes),
      tableName: Item.tableName
    });
    
    // Find all available cabinets - get model instances, not raw data
    let availableCabinets;
    try {
      availableCabinets = await Item.findAll({
        where: {
          Category: 'Available Cabinet',
          'MATERIAL AT ENG ROOM': 'YES'
        },
        // Don't use raw: true - we need model instances for .update()
        logging: (sql) => console.log('Generated SQL:', sql) // Log the actual SQL query
      });
    } catch (findError) {
      console.error('Error finding available cabinets:', findError);
      console.error('Error details:', {
        message: findError.message,
        sql: findError.sql,
        errno: findError.errno,
        sqlState: findError.sqlState
      });
      
      // Try alternative approach - select specific columns only
      console.log('Trying alternative query without assumed id column...');
      try {
        availableCabinets = await Item.findAll({
          where: {
            Category: 'Available Cabinet',
            'MATERIAL AT ENG ROOM': 'YES'
          },
          attributes: ['Temporary Cabinet', 'Packagecode', 'Packagedescription', 'Category', 'MATERIAL AT ENG ROOM'],
          // Don't use raw: true - we need model instances for .update()
          logging: (sql) => console.log('Alternative SQL:', sql)
        });
      } catch (altError) {
        console.error('Alternative query also failed:', altError);
        throw altError;
      }
    }

    console.log('Found available cabinets:', availableCabinets.length);

    if (availableCabinets.length === 0) {
      return res.status(400).json({
        error: 'No available cabinets found. Please create a new cabinet instead.'
      });
    }

    // Randomly select an available cabinet
    const randomIndex = Math.floor(Math.random() * availableCabinets.length);
    const selectedCabinet = availableCabinets[randomIndex];
    const assignedCabinetId = selectedCabinet['Temporary Cabinet'];

    console.log('Selected cabinet:', assignedCabinetId);

    // Prepare the updated data
    const updateData = {
      ...newItemData,
      'Temporary Cabinet': assignedCabinetId,
      'MATERIAL AT ENG ROOM': 'YES'
    };

    console.log('Preparing update data...');

    // Set default values for defect fields
    const defectFields = [
      'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
      'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 
      'PFA(Substrate)', 'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)',
      'Resinbleed(Substrate)', 'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)',
      'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
      'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)',
      'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)', 'Scratches(Die)', 'Crack(Die)',
      'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
      'Crack(BottomDefect)', 'Damageball(BottomDefect)'
    ];

    defectFields.forEach(field => {
      if (updateData[field] === undefined) {
        updateData[field] = '0';
      }
    });

    console.log('Updating selected cabinet with data...');
    // Update the selected cabinet with new item data
    await selectedCabinet.update(updateData);

    console.log('Marking cabinet as occupied (MATERIAL AT ENG ROOM = YES)...');
    // Mark the cabinet as occupied by setting MATERIAL AT ENG ROOM to YES
    await selectedCabinet.update({
      'MATERIAL AT ENG ROOM': 'YES'
    });

    console.log('Update successful, sending response...');
    res.status(201).json({
      message: 'Item registered and auto-assigned to cabinet successfully',
      item: selectedCabinet,
      assignedCabinet: assignedCabinetId,
      status: 'Cabinet marked as occupied'
    });
  } catch (error) {
    console.error('Auto-assign registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCabinet = async (req, res) => {
  try {
    const { cabinetId } = req.params;
    const newItemData = req.body;

    // Find the available cabinet
    const cabinet = await Item.findOne({
      where: { 
        'Temporary Cabinet': cabinetId,
        Category: 'Available Cabinet'
      }
    });
    
    if (!cabinet) {
      return res.status(404).json({ error: 'Available cabinet not found' });
    }

    // Prepare the updated data
    const updateData = {
      ...newItemData,
      'Temporary Cabinet': cabinetId,
      'MATERIAL AT ENG ROOM': 'YES'
    };

    // Set default values for defect fields
    const defectFields = [
      'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
      'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 
      'PFA(Substrate)', 'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)',
      'Resinbleed(Substrate)', 'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)',
      'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
      'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)',
      'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)', 'Scratches(Die)', 'Crack(Die)',
      'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
      'Crack(BottomDefect)', 'Damageball(BottomDefect)'
    ];

    defectFields.forEach(field => {
      if (updateData[field] === undefined) {
        updateData[field] = '0';
      }
    });

    // Update the cabinet with new item data
    await cabinet.update(updateData);

    res.json({
      message: 'Cabinet updated successfully with new item data',
      item: cabinet,
    });
  } catch (error) {
    console.error('Update cabinet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { location } = req.params;
    const updates = req.body;

    const item = await Item.findOne({
      where: { 'Temporary Cabinet': location }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Only admin can update or if it's the user who took the sample
    if (req.user.role !== 'admin' && item['Eng Sample Taken By Email'] !== req.user.email) {
      return res.status(403).json({ error: 'Can only update your own items' });
    }

    await item.update(updates);

    res.json({
      message: 'Item updated successfully',
      item: item,
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerItem,
  registerItemAutoAssign,
  getAllItems,
  getItemByLocation,
  getCategories,
  getPackageCodes,
  getAvailableCabinets,
  updateCabinet,
  updateItem,
};