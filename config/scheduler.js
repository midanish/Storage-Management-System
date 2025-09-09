const cron = require('node-cron');
const { BorrowHistory, Item, User } = require('../models');
const { sendReminderEmail } = require('./emailService');
const { Op } = require('sequelize');

const checkForReminders = async () => {
  try {
    console.log('Checking for reminder emails to send...');
    
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const borrowsNeedingReminder = await BorrowHistory.findAll({
      where: {
        return_status: 'Borrowed',
        reminder_sent: false,
        due_at: {
          [Op.lte]: twoHoursFromNow,
          [Op.gt]: now,
        },
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    console.log(`Found ${borrowsNeedingReminder.length} items needing reminder emails`);

    for (const borrow of borrowsNeedingReminder) {
      try {
        // Manually fetch item details
        const item = await Item.findOne({
          where: { 'Temporary Cabinet': borrow.cabinet_location }
        });

        const dueAt = new Date(borrow.due_at);
        const timeLeft = dueAt.getTime() - now.getTime();
        const hoursLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60)));

        await sendReminderEmail({
          to: borrow.borrower.email,
          borrowRecord: {...borrow.toJSON(), item: item ? item.toJSON() : null},
          hoursLeft,
        });

        await borrow.update({ reminder_sent: true });
        
        console.log(`Reminder sent to ${borrow.borrower.email} for item ${item ? item['Temporary Cabinet'] : 'Unknown'}`);
      } catch (emailError) {
        console.error(`Failed to send reminder for borrow ID ${borrow.id}:`, emailError);
      }
    }
  } catch (error) {
    console.error('Error in reminder check:', error);
  }
};

const checkForOverdueItems = async () => {
  try {
    console.log('Checking for overdue items...');
    
    const now = new Date();
    
    const overdueItems = await BorrowHistory.findAll({
      where: {
        return_status: 'Borrowed',
        due_at: {
          [Op.lt]: now,
        },
      },
      include: [
        {
          model: User,
          as: 'borrower',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (overdueItems.length > 0) {
      console.log(`Found ${overdueItems.length} overdue items`);
      
      for (const overdueItem of overdueItems) {
        // Manually fetch item details
        const item = await Item.findOne({
          where: { 'Temporary Cabinet': overdueItem.cabinet_location }
        });

        const dueAt = new Date(overdueItem.due_at);
        const overdueDuration = now.getTime() - dueAt.getTime();
        const overdueHours = Math.floor(overdueDuration / (1000 * 60 * 60));
        
        console.log(
          `Overdue: ${item ? item['Temporary Cabinet'] : 'Unknown'} borrowed by ${overdueItem.borrower.email} (${overdueHours}h overdue)`
        );
      }
    } else {
      console.log('No overdue items found');
    }
  } catch (error) {
    console.error('Error in overdue check:', error);
  }
};

const startScheduler = () => {
  console.log('Starting email reminder scheduler...');

  cron.schedule('*/30 * * * *', () => {
    console.log('Running scheduled reminder check...');
    checkForReminders();
  });

  cron.schedule('0 */4 * * *', () => {
    console.log('Running scheduled overdue check...');
    checkForOverdueItems();
  });

  console.log('Scheduler started successfully');
  console.log('- Reminder emails: Every 30 minutes');
  console.log('- Overdue check: Every 4 hours');
};

if (require.main === module) {
  startScheduler();
  
  setInterval(() => {
    console.log('Scheduler is running...', new Date().toISOString());
  }, 60000);
} else {
  startScheduler();
}

module.exports = {
  startScheduler,
  checkForReminders,
  checkForOverdueItems,
};