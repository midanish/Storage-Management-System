const express = require('express');
const {
  registerItem,
  registerItemAutoAssign,
  getAllItems,
  getItemByLocation,
  getCategories,
  getPackageCodes,
  getAvailableCabinets,
  updateCabinet,
  updateItem,
} = require('../controllers/itemController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         category:
 *           type: string
 *         package_code:
 *           type: string
 *         box_id:
 *           type: string
 *         total_samples:
 *           type: integer
 *         current_samples:
 *           type: integer
 *         material_at_eng_room:
 *           type: string
 *           enum: [YES, NO]
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         registered_by:
 *           type: integer
 *     ItemRegisterRequest:
 *       type: object
 *       required:
 *         - category
 *         - package_code
 *         - box_id
 *         - total_samples
 *       properties:
 *         category:
 *           type: string
 *         package_code:
 *           type: string
 *         box_id:
 *           type: string
 *         total_samples:
 *           type: integer
 *         description:
 *           type: string
 *         location:
 *           type: string
 */

/**
 * @swagger
 * /api/items/register:
 *   post:
 *     summary: Register a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItemRegisterRequest'
 *     responses:
 *       201:
 *         description: Item registered successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/register', authenticateToken, registerItem);

/**
 * @swagger
 * /api/items/register-auto-assign:
 *   post:
 *     summary: Register item with auto-assigned cabinet
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItemRegisterRequest'
 *     responses:
 *       201:
 *         description: Item registered and auto-assigned successfully
 *       400:
 *         description: Bad request or no available cabinets
 *       401:
 *         description: Unauthorized
 */
router.post('/register-auto-assign', authenticateToken, registerItemAutoAssign);

/**
 * @swagger
 * /api/items/available-cabinets:
 *   get:
 *     summary: Get all available cabinets
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available cabinets
 *       401:
 *         description: Unauthorized
 */
router.get('/available-cabinets', authenticateToken, getAvailableCabinets);

/**
 * @swagger
 * /api/items/update-cabinet/{cabinetId}:
 *   patch:
 *     summary: Update cabinet with new item data
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cabinetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cabinet ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItemRegisterRequest'
 *     responses:
 *       200:
 *         description: Cabinet updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cabinet not found
 */
router.patch('/update-cabinet/:cabinetId', authenticateToken, updateCabinet);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items with pagination and filters
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: package_code
 *         schema:
 *           type: string
 *         description: Filter by package code
 *       - in: query
 *         name: available_only
 *         schema:
 *           type: boolean
 *         description: Show only available items
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
 *         description: List of items
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, getAllItems);

/**
 * @swagger
 * /api/items/categories:
 *   get:
 *     summary: Get all available categories
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       401:
 *         description: Unauthorized
 */
router.get('/categories', authenticateToken, getCategories);

/**
 * @swagger
 * /api/items/package-codes:
 *   get:
 *     summary: Get all available package codes
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of package codes
 *       401:
 *         description: Unauthorized
 */
router.get('/package-codes', authenticateToken, getPackageCodes);

/**
 * @swagger
 * /api/items/{location}:
 *   get:
 *     summary: Get item by cabinet location
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: Cabinet location (e.g., C1-S5)
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/details/:location', authenticateToken, getItemByLocation);
router.get('/:location', authenticateToken, getItemByLocation);

/**
 * @swagger
 * /api/items/{location}:
 *   put:
 *     summary: Update an item by cabinet location
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: Cabinet location (e.g., C1-S5)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItemRegisterRequest'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
router.put('/:location', authenticateToken, updateItem);

module.exports = router;