const express = require('express');
const {
  returnItem,
  getPendingReturns,
  getReturnableItems,
  updateReturnJustification,
} = require('../controllers/returnController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ReturnRequest:
 *       type: object
 *       required:
 *         - returned_samples
 *       properties:
 *         returned_samples:
 *           type: integer
 *           minimum: 0
 *         justification:
 *           type: string
 *           description: Required when returning fewer samples than expected
 */

/**
 * @swagger
 * /api/return/{itemId}:
 *   post:
 *     summary: Return a borrowed item
 *     tags: [Return]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID to return
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReturnRequest'
 *     responses:
 *       200:
 *         description: Item returned successfully
 *       400:
 *         description: Bad request (missing samples need justification)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active borrow record found
 */
router.post('/:itemId', authenticateToken, returnItem);

/**
 * @swagger
 * /api/return/returnable:
 *   get:
 *     summary: Get items available for return by current user
 *     tags: [Return]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of returnable items with time information
 *       401:
 *         description: Unauthorized
 */
router.get('/returnable', authenticateToken, getReturnableItems);

/**
 * @swagger
 * /api/return/pending:
 *   get:
 *     summary: Get pending returns awaiting admin approval
 *     tags: [Return]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending returns
 *       401:
 *         description: Unauthorized
 */
router.get('/pending', authenticateToken, getPendingReturns);

/**
 * @swagger
 * /api/return/justification/{borrowId}:
 *   put:
 *     summary: Update justification for a pending return
 *     tags: [Return]
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
 *             type: object
 *             required:
 *               - justification
 *             properties:
 *               justification:
 *                 type: string
 *     responses:
 *       200:
 *         description: Justification updated successfully
 *       400:
 *         description: Justification is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Pending return record not found
 */
router.put('/justification/:borrowId', authenticateToken, updateReturnJustification);

module.exports = router;