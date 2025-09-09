const { BorrowHistory, Item, User } = require('../models');
const { Op } = require('sequelize');

const getAvailableItems = async (req, res) => {
  try {
    const { category, packagecode } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {
      'MATERIAL AT ENG ROOM': 'YES',
    };

    if (category) {
      whereClause.Category = category;
    } else {
      whereClause.Category = {
        [Op.and]: [
          { [Op.ne]: 'Available Cabinet' },
          { [Op.ne]: null },
          { [Op.ne]: '' }
        ]
      };
    }

    if (packagecode) {
      whereClause.Packagecode = packagecode;
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
    console.error('Get available items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const borrowItem = async (req, res) => {
  try {
    const { cabinetLocation } = req.params;

    const item = await Item.findOne({
      where: { 'Temporary Cabinet': cabinetLocation }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item['MATERIAL AT ENG ROOM'] !== 'YES') {
      return res.status(400).json({ error: 'Item is not available for borrowing' });
    }

    if (item.Category === 'Available Cabinet') {
      return res.status(400).json({ error: 'Cannot borrow items from Available Cabinet category' });
    }

    const existingBorrow = await BorrowHistory.findOne({
      where: {
        cabinet_location: cabinetLocation,
        return_status: {
          [Op.in]: ['Borrowed', 'In Progress'],
        },
      },
    });

    if (existingBorrow) {
      return res.status(400).json({ error: 'Item is already borrowed' });
    }

    const borrowedAt = new Date();
    const dueAt = new Date(borrowedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log('borrowItem - Creating record for user ID:', req.user.id);
    console.log('borrowItem - User:', JSON.stringify(req.user, null, 2));
    
    const borrowRecord = await BorrowHistory.create({
      cabinet_location: cabinetLocation,
      package_code: item.Packagecode || '',
      user_id: req.user.id,
      borrowed_at: borrowedAt,
      due_at: dueAt,
      expected_samples: item.TotalSample || 0,
      return_status: 'Borrowed',
      created_at: borrowedAt,
      updated_at: borrowedAt,
    });

    console.log('borrowItem - Created record with ID:', borrowRecord.id);

    // Update item status
    await item.update({ 
      'MATERIAL AT ENG ROOM': 'NO',
      'Eng Sample Taken By Email': req.user.email 
    });

    // Get the borrow record with user info
    const borrowWithDetails = await BorrowHistory.findByPk(borrowRecord.id, {
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email', 'role'],
        },
      ],
    });

    // Get item details
    const itemDetails = await Item.findOne({
      where: { 'Temporary Cabinet': cabinetLocation }
    });

    res.status(201).json({
      message: 'Item borrowed successfully',
      borrowRecord: {
        ...borrowWithDetails.toJSON(),
        item: itemDetails,
      },
    });
  } catch (error) {
    console.error('Borrow item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserBorrowHistory = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: req.user.id };

    if (status) {
      whereClause.return_status = status;
    }

    const { count, rows: borrowHistory } = await BorrowHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email', 'role'],
        },
      ],
      limit,
      offset,
      order: [['borrowed_at', 'DESC']],
    });

    // Enrich with item details
    const enrichedHistory = await Promise.all(
      borrowHistory.map(async (borrow) => {
        const item = await Item.findOne({
          where: { 'Temporary Cabinet': borrow.cabinet_location }
        });
        
        return {
          ...borrow.toJSON(),
          item: item ? item.toJSON() : null,
        };
      })
    );

    res.json({
      borrowHistory: enrichedHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get user borrow history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCurrentBorrowedItems = async (req, res) => {
  try {
    console.log('getCurrentBorrowedItems - User ID:', req.user.id);
    console.log('getCurrentBorrowedItems - User:', JSON.stringify(req.user, null, 2));
    
    const borrowedItems = await BorrowHistory.findAll({
      where: {
        user_id: req.user.id,
        return_status: 'Borrowed',
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email', 'role'],
        },
      ],
      order: [['borrowed_at', 'DESC']],
    });

    console.log('getCurrentBorrowedItems - Found items:', borrowedItems.length);

    // Enrich with item details and time calculations
    const itemsWithTimeLeft = await Promise.all(
      borrowedItems.map(async (borrow) => {
        const item = await Item.findOne({
          where: { 'Temporary Cabinet': borrow.cabinet_location }
        });

        const now = new Date();
        const dueAt = new Date(borrow.due_at);
        const timeLeft = Math.max(0, dueAt.getTime() - now.getTime());
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        return {
          ...borrow.toJSON(),
          item: item ? item.toJSON() : null,
          timeLeft: {
            hours: hoursLeft,
            minutes: minutesLeft,
            expired: timeLeft === 0,
          },
        };
      })
    );

    res.json({
      borrowedItems: itemsWithTimeLeft,
    });
  } catch (error) {
    console.error('Get current borrowed items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAvailableItems,
  borrowItem,
  getUserBorrowHistory,
  getCurrentBorrowedItems,
};