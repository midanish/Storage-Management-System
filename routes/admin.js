const express = require('express');
const {
  getAllBorrowedItems,
  getPendingApprovals,
  approveReturn,
  getOverdueItems,
  getDashboardStats,
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * components:
 *   schemas:
 *     ApprovalRequest:
 *       type: object
 *       required:
 *         - approved
 *       properties:
 *         approved:
 *           type: boolean
 *         admin_comments:
 *           type: string
 */

/**
 * @swagger
 * /api/admin/borrowed:
 *   get:
 *     summary: Get all borrowed items (Admin only)
 *     tags: [Admin]
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
 *         name: user_email
 *         schema:
 *           type: string
 *         description: Filter by user email
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
 *         description: List of all borrowed items
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/borrowed', getAllBorrowedItems);

/**
 * @swagger
 * /api/admin/pending-approvals:
 *   get:
 *     summary: Get pending return approvals (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of pending approvals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * @swagger
 * /api/admin/approve/{borrowId}:
 *   post:
 *     summary: Approve or reject a return request (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: borrowId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Borrow history ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApprovalRequest'
 *     responses:
 *       200:
 *         description: Return approved or rejected successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Pending return record not found
 */
router.post('/approve/:borrowId', approveReturn);

/**
 * @swagger
 * /api/admin/overdue:
 *   get:
 *     summary: Get overdue borrowed items (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of overdue items
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/overdue', getOverdueItems);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalBorrowed:
 *                       type: integer
 *                     pendingReturns:
 *                       type: integer
 *                     overdueItems:
 *                       type: integer
 *                     totalReturned:
 *                       type: integer
 *                     availableItems:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     pendingApprovals:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', getDashboardStats);

module.exports = router;