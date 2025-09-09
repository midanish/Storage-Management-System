const { BorrowHistory, Item, User } = require('../models');
const { Op } = require('sequelize');
const { sendEmailToUser } = require('../config/emailService');

const getAllBorrowedItems = async (req, res) => {
  try {
    const { status, user_email } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (status) {
      whereClause.return_status = status;
    }

    let userWhereClause = {};
    if (user_email) {
      userWhereClause.email = {
        [Op.like]: `%${user_email}%`
      };
    }

    const { count, rows: borrowHistory } = await BorrowHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          include: [
            {
              model: User,
              as: 'registeredBy',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
          where: userWhereClause,
        },
      ],
      limit,
      offset,
      order: [['borrowed_at', 'DESC']],
    });

    const borrowHistoryWithTimeInfo = borrowHistory.map(borrow => {
      const now = new Date();
      const dueAt = new Date(borrow.due_at);
      const timeLeft = Math.max(0, dueAt.getTime() - now.getTime());
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const overdue = now > dueAt;

      return {
        ...borrow.toJSON(),
        timeInfo: {
          hours: hoursLeft,
          minutes: minutesLeft,
          overdue,
          expired: timeLeft === 0,
        },
      };
    });

    res.json({
      borrowHistory: borrowHistoryWithTimeInfo,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get all borrowed items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPendingApprovals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: pendingApprovals } = await BorrowHistory.findAndCountAll({
      where: {
        return_status: 'In Progress',
        admin_approved: null,
      },
      include: [
        {
          model: Item,
          as: 'item',
          include: [
            {
              model: User,
              as: 'registeredBy',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
        },
      ],
      limit,
      offset,
      order: [['returned_at', 'ASC']],
    });

    res.json({
      pendingApprovals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const approveReturn = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const { approved, admin_comments } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Approval decision (approved) is required' });
    }

    const borrowRecord = await BorrowHistory.findOne({
      where: {
        id: borrowId,
        return_status: 'In Progress',
        admin_approved: null,
      },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!borrowRecord) {
      return res.status(404).json({ 
        error: 'Pending return record not found' 
      });
    }

    if (approved) {
      await borrowRecord.update({
        return_status: 'Returned',
        admin_approved: true,
        admin_comments: admin_comments || null,
      });

      await borrowRecord.item.update({
        material_at_eng_room: 'YES',
        current_samples: borrowRecord.returned_samples,
      });

      try {
        await sendEmailToUser({
          to: borrowRecord.borrower.email,
          subject: 'Return Approved - Item Available Again',
          borrowRecord: borrowRecord.toJSON(),
          approved: true,
          adminComments: admin_comments,
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      res.json({
        message: 'Return approved successfully',
        borrowRecord: await BorrowHistory.findByPk(borrowRecord.id, {
          include: [
            {
              model: Item,
              as: 'item',
            },
            {
              model: User,
              as: 'borrower',
              attributes: ['id', 'name', 'email'],
            },
          ],
        }),
      });
    } else {
      await borrowRecord.update({
        admin_approved: false,
        admin_comments: admin_comments || null,
      });

      try {
        await sendEmailToUser({
          to: borrowRecord.borrower.email,
          subject: 'Return Rejected - Additional Action Required',
          borrowRecord: borrowRecord.toJSON(),
          approved: false,
          adminComments: admin_comments,
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      res.json({
        message: 'Return rejected. User has been notified.',
        borrowRecord: await BorrowHistory.findByPk(borrowRecord.id, {
          include: [
            {
              model: Item,
              as: 'item',
            },
            {
              model: User,
              as: 'borrower',
              attributes: ['id', 'name', 'email'],
            },
          ],
        }),
      });
    }
  } catch (error) {
    console.error('Approve return error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOverdueItems = async (req, res) => {
  try {
    const now = new Date();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: overdueItems } = await BorrowHistory.findAndCountAll({
      where: {
        return_status: 'Borrowed',
        due_at: {
          [Op.lt]: now,
        },
      },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
        },
      ],
      limit,
      offset,
      order: [['due_at', 'ASC']],
    });

    const overdueWithTimeInfo = overdueItems.map(borrow => {
      const dueAt = new Date(borrow.due_at);
      const overdueDuration = now.getTime() - dueAt.getTime();
      const overdueHours = Math.floor(overdueDuration / (1000 * 60 * 60));
      const overdueDays = Math.floor(overdueHours / 24);

      return {
        ...borrow.toJSON(),
        overdueInfo: {
          hours: overdueHours,
          days: overdueDays,
          duration: overdueDuration,
        },
      };
    });

    res.json({
      overdueItems: overdueWithTimeInfo,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get overdue items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    const totalBorrowed = await BorrowHistory.count({
      where: { return_status: 'Borrowed' }
    });

    const pendingReturns = await BorrowHistory.count({
      where: { return_status: 'In Progress' }
    });

    const overdueItems = await BorrowHistory.count({
      where: {
        return_status: 'Borrowed',
        due_at: { [Op.lt]: now }
      }
    });

    const totalReturned = await BorrowHistory.count({
      where: { return_status: 'Returned' }
    });

    const availableItems = await Item.count({
      where: { material_at_eng_room: 'YES' }
    });

    const totalItems = await Item.count();

    const pendingApprovals = await BorrowHistory.count({
      where: {
        return_status: 'In Progress',
        admin_approved: null,
      }
    });

    res.json({
      stats: {
        totalBorrowed,
        pendingReturns,
        overdueItems,
        totalReturned,
        availableItems,
        totalItems,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllBorrowedItems,
  getPendingApprovals,
  approveReturn,
  getOverdueItems,
  getDashboardStats,
};