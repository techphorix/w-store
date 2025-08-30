const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Configure multer for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads', file.fieldname || 'general');
    
    // Create directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Upload single file
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No file uploaded'
      });
    }

    const fileInfo = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.file.fieldname || 'general'}/${req.file.filename}`,
      uploadedBy: req.userId,
      uploadedAt: new Date()
    };

    // Store file info in database
    await executeQuery(`
      INSERT INTO file_uploads (
        id, original_name, filename, mimetype, size, path, url, 
        uploaded_by, uploaded_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fileInfo.id, fileInfo.originalName, fileInfo.filename,
      fileInfo.mimetype, fileInfo.size, fileInfo.path, fileInfo.url,
      fileInfo.uploadedBy, fileInfo.uploadedAt, 'active'
    ]);

    res.json({
      error: false,
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileInfo = {
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.fieldname || 'general'}/${file.filename}`,
        uploadedBy: req.userId,
        uploadedAt: new Date()
      };

      // Store file info in database
      await executeQuery(`
        INSERT INTO file_uploads (
          id, original_name, filename, mimetype, size, path, url, 
          uploaded_by, uploaded_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        fileInfo.id, fileInfo.originalName, fileInfo.filename,
        fileInfo.mimetype, fileInfo.size, fileInfo.path, fileInfo.url,
        fileInfo.uploadedBy, fileInfo.uploadedAt, 'active'
      ]);

      uploadedFiles.push(fileInfo);
    }

    res.json({
      error: false,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    logger.error('Error uploading multiple files:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to upload files',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get uploaded files (admin only)
router.get('/files', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, uploadedBy } = req.query;
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClause = '1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (uploadedBy) {
      whereClause += ' AND uploaded_by = ?';
      params.push(uploadedBy);
    }

    const files = await executeQuery(`
      SELECT f.*, u.full_name as uploaded_by_name
      FROM file_uploads f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE ${whereClause}
      ORDER BY f.uploaded_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parsedLimit, offset]);

    // Get total count for pagination
    const totalCount = await executeQuery(`
      SELECT COUNT(*) as total FROM file_uploads WHERE ${whereClause}
    `, params);

    res.json({
      error: false,
      files,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / parsedLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching uploaded files:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch uploaded files',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete file (admin only)
router.delete('/files/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get file info
    const file = await executeQuery('SELECT * FROM file_uploads WHERE id = ?', [id]);
    
    if (file.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'File not found'
      });
    }

    const fileInfo = file[0];

    // Delete physical file
    try {
      await fs.unlink(fileInfo.path);
    } catch (unlinkError) {
      logger.warn(`Could not delete physical file: ${fileInfo.path}`, unlinkError);
    }

    // Delete from database
    await executeQuery('DELETE FROM file_uploads WHERE id = ?', [id]);

    res.json({
      error: false,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update file status (admin only)
router.put('/files/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'deleted'].includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid status. Must be active, inactive, or deleted'
      });
    }

    await executeQuery(
      'UPDATE file_uploads SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date(), id]
    );

    res.json({
      error: false,
      message: 'File status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating file status:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update file status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get file statistics (admin only)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_files,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_files,
        COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_files,
        SUM(size) as total_size,
        AVG(size) as average_size,
        COUNT(DISTINCT uploaded_by) as unique_uploaders
      FROM file_uploads
    `);

    // Get file type distribution
    const fileTypes = await executeQuery(`
      SELECT 
        mimetype,
        COUNT(*) as count,
        SUM(size) as total_size
      FROM file_uploads
      WHERE status = 'active'
      GROUP BY mimetype
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get recent uploads
    const recentUploads = await executeQuery(`
      SELECT 
        f.*, u.full_name as uploaded_by_name
      FROM file_uploads f
      LEFT JOIN users u ON f.uploaded_by = u.id
      ORDER BY f.uploaded_at DESC
      LIMIT 10
    `);

    res.json({
      error: false,
      stats: {
        ...stats[0],
        total_size_mb: Math.round((stats[0].total_size || 0) / (1024 * 1024) * 100) / 100,
        average_size_kb: Math.round((stats[0].average_size || 0) / 1024 * 100) / 100
      },
      fileTypes,
      recentUploads
    });
  } catch (error) {
    logger.error('Error fetching upload statistics:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch upload statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
