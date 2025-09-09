const { BorrowHistory, Item, User } = require('../models');
const { Op } = require('sequelize');
const { sendEmailToAdmin } = require('../config/emailService');

const returnItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { returned_samples, justification } = req.body;

    if (returned_samples === undefined || returned_samples === null) {
      return res.status(400).json({ error: 'Returned samples count is required' });
    }

    if (returned_samples < 0) {
      return res.status(400).json({ error: 'Returned samples cannot be negative' });
    }

    const borrowRecord = await BorrowHistory.findOne({
      where: {
        id: itemId,
        user_id: req.user.id,
        return_status: 'Borrowed',
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email'],
        },
      ],
    });

    if (!borrowRecord) {
      return res.status(404).json({ 
        error: 'No active borrow record found for this item' 
      });
    }

    const expectedSamples = borrowRecord.expected_samples;
    const returnedAt = new Date();

    // Check if returned amount is fewer than expected and justification is needed
    if (returned_samples < expectedSamples && (!justification || justification.trim() === '')) {
      return res.status(400).json({
        error: 'Justification is required when returning fewer samples than expected',
        requiresJustification: true,
        expectedSamples,
        returnedSamples: returned_samples
      });
    }

    if (returned_samples === expectedSamples) {
      await borrowRecord.update({
        returned_at: returnedAt,
        returned_samples,
        return_status: 'Returned',
      });

      const item = await Item.findOne({
        where: { [`Temporary Cabinet`]: borrowRecord.cabinet_location }
      });
      
      if (item) {
        await item.update({
          'MATERIAL AT ENG ROOM': 'YES',
        });
      }

      const updatedRecord = await BorrowHistory.findByPk(borrowRecord.id, {
        include: [
          {
            model: User,
            as: 'borrower',
            attributes: ['id', 'email'],
          },
        ],
      });

      res.json({
        message: 'Item returned successfully',
        borrowRecord: {
          ...updatedRecord.toJSON(),
          item: item ? item.toJSON() : null,
        },
      });
    } else if (returned_samples < expectedSamples) {

      await borrowRecord.update({
        returned_at: returnedAt,
        returned_samples,
        return_status: 'In Progress',
        justification: justification.trim(),
        admin_approved: null,
      });

      try {
        await sendEmailToAdmin({
          subject: 'Return Justification Required - Missing Samples',
          borrowRecord: {
            ...borrowRecord.toJSON(),
            returned_samples,
            justification: justification.trim(),
          },
          missingCount: expectedSamples - returned_samples,
        });
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
      }

      const updatedRecord = await BorrowHistory.findByPk(borrowRecord.id, {
        include: [
          {
            model: User,
            as: 'borrower',
            attributes: ['id', 'email'],
          },
        ],
      });
      
      const itemData = await Item.findOne({
        where: { [`Temporary Cabinet`]: updatedRecord.cabinet_location }
      });

      res.json({
        message: 'Return submitted for admin approval due to missing samples',
        borrowRecord: {
          ...updatedRecord.toJSON(),
          item: itemData ? itemData.toJSON() : null,
        },
        requiresApproval: true,
      });
    } else {
      return res.status(400).json({
        error: 'Cannot return more samples than expected',
      });
    }
  } catch (error) {
    console.error('Return item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPendingReturns = async (req, res) => {
  try {
    const pendingReturns = await BorrowHistory.findAll({
      where: {
        user_id: req.user.id,
        return_status: 'In Progress',
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email'],
        },
      ],
      order: [['returned_at', 'DESC']],
    });

    // Enrich with item details
    const returnsWithItemInfo = await Promise.all(
      pendingReturns.map(async (returnRecord) => {
        const item = await Item.findOne({
          where: { [`Temporary Cabinet`]: returnRecord.cabinet_location }
        });

        return {
          ...returnRecord.toJSON(),
          item: item ? item.toJSON() : null,
        };
      })
    );

    res.json({
      pendingReturns: returnsWithItemInfo,
    });
  } catch (error) {
    console.error('Get pending returns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReturnableItems = async (req, res) => {
  try {
    console.log('getReturnableItems - User ID:', req.user.id);
    
    const returnableItems = await BorrowHistory.findAll({
      where: {
        user_id: req.user.id,
        return_status: 'Borrowed',
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email'],
        },
      ],
      order: [['borrowed_at', 'DESC']],
    });

    console.log('getReturnableItems - Found items:', returnableItems.length);

    // Enrich with item details and time calculations
    const itemsWithTimeInfo = await Promise.all(
      returnableItems.map(async (borrow) => {
        const item = await Item.findOne({
          where: { [`Temporary Cabinet`]: borrow.cabinet_location }
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
            overdue: timeLeft === 0,
          },
        };
      })
    );

    res.json({
      returnableItems: itemsWithTimeInfo,
    });
  } catch (error) {
    console.error('Get returnable items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReturnJustification = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const { justification } = req.body;

    if (!justification || justification.trim() === '') {
      return res.status(400).json({ error: 'Justification is required' });
    }

    const borrowRecord = await BorrowHistory.findOne({
      where: {
        id: borrowId,
        user_id: req.user.id,
        return_status: 'In Progress',
      },
    });

    if (!borrowRecord) {
      return res.status(404).json({ 
        error: 'Pending return record not found' 
      });
    }

    await borrowRecord.update({
      justification: justification.trim(),
    });

    const updatedRecord = await BorrowHistory.findByPk(borrowId, {
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'email'],
        },
      ],
    });
    
    const item = await Item.findOne({
      where: { [`Temporary Cabinet`]: updatedRecord.cabinet_location }
    });

    try {
      await sendEmailToAdmin({
        subject: 'Updated Return Justification - Missing Samples',
        borrowRecord: updatedRecord.toJSON(),
        missingCount: updatedRecord.expected_samples - updatedRecord.returned_samples,
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    res.json({
      message: 'Justification updated successfully',
      borrowRecord: {
        ...updatedRecord.toJSON(),
        item: item ? item.toJSON() : null,
      },
    });
  } catch (error) {
    console.error('Update justification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  returnItem,
  getPendingReturns,
  getReturnableItems,
  updateReturnJustification,
};