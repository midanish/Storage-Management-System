const express = require('express');
const {
  getAvailableItems,
  borrowItem,
  getUserBorrowHistory,
  getCurrentBorrowedItems,
} = require('../controllers/borrowController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BorrowHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         item_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         borrowed_at:
 *           type: string
 *           format: date-time
 *         due_at:
 *           type: string
 *           format: date-time
 *         returned_at:
 *           type: string
 *           format: date-time
 *         return_status:
 *           type: string
 *           enum: [Borrowed, In Progress, Returned]
 *         expected_samples:
 *           type: integer
 *         returned_samples:
 *           type: integer
 *         justification:
 *           type: string
 *         admin_approved:
 *           type: boolean
 *         reminder_sent:
 *           type: boolean
 */

/**
 * @swagger
 * /api/borrow/available:
 *   get:
 *     summary: Get available items for borrowing
 *     tags: [Borrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (excludes Available Cabinet)
 *       - in: query
 *         name: package_code
 *         schema:
 *           type: string
 *         description: Filter by package code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of available items
 *       401:
 *         description: Unauthorized
 */
router.get('/available', authenticateToken, getAvailableItems);

/**
 * @swagger
 * /api/borrow/{cabinetLocation}:
 *   post:
 *     summary: Borrow an item by cabinet location
 *     tags: [Borrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cabinetLocation
 *         required: true
 *         schema:
 *           type: string
 *         description: Cabinet location to borrow (e.g., C1-S5)
 *     responses:
 *       201:
 *         description: Item borrowed successfully
 *       400:
 *         description: Item not available or already borrowed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.post('/:cabinetLocation', authenticateToken, borrowItem);

/**
 * @swagger
 * /api/borrow/history:
 *   get:
 *     summary: Get user's borrow history
 *     tags: [Borrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Borrowed, In Progress, Returned]
 *         description: Filter by return status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: User's borrow history
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticateToken, getUserBorrowHistory);

/**
 * @swagger
 * /api/borrow/current:
 *   get:
 *     summary: Get currently borrowed items with time remaining
 *     tags: [Borrow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Currently borrowed items with countdown timer
 *       401:
 *         description: Unauthorized
 */
router.get('/current', authenticateToken, getCurrentBorrowedItems);

module.exports = router;