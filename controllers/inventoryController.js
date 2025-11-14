import Medicine from '../models/Medicine.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

// @desc    Get all medicines
// @route   GET /api/inventory/medicines
// @access  Private
export const getAllMedicines = async (req, res) => {
  try {
    const { search, category, lowStock, expiringSoon, expired, page = 1, limit = 50, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const skip = (page - 1) * limit;

    // Build base query - include medicines where isActive is true or doesn't exist
    const baseConditions = {
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    };

    let query = { ...baseConditions };
    const queryConditions = [baseConditions];

    // Category filter
    if (category && category.trim()) {
      queryConditions.push({ category: { $regex: category.trim(), $options: 'i' } });
    }

    // Search filter
    if (search && search.trim()) {
      const searchConditions = {
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { genericName: { $regex: search.trim(), $options: 'i' } },
          { brandName: { $regex: search.trim(), $options: 'i' } }
        ]
      };
      queryConditions.push(searchConditions);
    }

    // Build final query
    if (queryConditions.length > 1) {
      query = { $and: queryConditions };
    } else {
      query = baseConditions;
    }

    // Low stock filter
    if (lowStock === 'true') {
      const lowStockCondition = {
        $expr: {
          $lte: [
            { $ifNull: ['$stockQuantity', 0] },
            { $ifNull: ['$minStockLevel', 10] }
          ]
        }
      };
      if (query.$and) {
        query.$and.push(lowStockCondition);
      } else {
        query = { $and: [query, lowStockCondition] };
      }
    }

    // Expiring soon filter (within 30 days)
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiryCondition = {
        expiryDate: {
          $lte: thirtyDaysFromNow,
          $gte: new Date()
        }
      };
      if (query.$and) {
        query.$and.push(expiryCondition);
      } else {
        query = { $and: [query, expiryCondition] };
      }
    }

    // Expired filter
    if (expired === 'true') {
      const expiredCondition = { expiryDate: { $lt: new Date() } };
      if (query.$and) {
        query.$and.push(expiredCondition);
      } else {
        query = { $and: [query, expiredCondition] };
      }
    }

    // Build sort object - validate sortBy field to prevent errors
    const allowedSortFields = ['name', 'price', 'stockQuantity', 'expiryDate', 'createdAt', 'category'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortObject = { [sortField]: sortDirection };

    // Execute query with error handling
    let medicines, total;
    try {
      medicines = await Medicine.find(query)
        .sort(sortObject)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .select('-__v')
        .lean();

      total = await Medicine.countDocuments(query);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        error: dbError.message
      });
    }

    // Calculate statistics
    const allMedicines = await Medicine.find({
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    });
    const lowStockCount = allMedicines.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length;
    const expiringSoonCount = allMedicines.filter(m => {
      if (!m.expiryDate) return false;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return new Date(m.expiryDate) <= thirtyDaysFromNow && new Date(m.expiryDate) > new Date();
    }).length;
    const expiredCount = allMedicines.filter(m => {
      if (!m.expiryDate) return false;
      return new Date(m.expiryDate) < new Date();
    }).length;

    res.status(200).json({
      success: true,
      data: medicines,
      stats: {
        total: allMedicines.length,
        lowStock: lowStockCount,
        expiringSoon: expiringSoonCount,
        expired: expiredCount
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllMedicines:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching medicines'
    });
  }
};

// @desc    Get medicine by ID
// @route   GET /api/inventory/medicines/:id
// @access  Private
export const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create or update medicine
// @route   POST /api/inventory/medicines
// @route   PUT /api/inventory/medicines/:id
// @access  Private/Admin
export const createOrUpdateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const medicineData = req.body;

    let medicine;
    if (id) {
      medicine = await Medicine.findByIdAndUpdate(id, medicineData, {
        new: true,
        runValidators: true
      });
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }
    } else {
      medicine = await Medicine.create(medicineData);
    }

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update stock quantity
// @route   PUT /api/inventory/medicines/:id/stock
// @access  Private/Admin
export const updateStock = async (req, res) => {
  try {
    const { quantity, transactionType, notes } = req.body;
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    const previousStock = medicine.stockQuantity;
    const newStock = Math.max(0, previousStock + quantity);

    medicine.stockQuantity = newStock;
    await medicine.save();

    // Create transaction record
    await InventoryTransaction.create({
      medicine: medicine._id,
      transactionType: transactionType || 'adjustment',
      quantity,
      previousStock,
      newStock,
      performedBy: req.user._id,
      notes
    });

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get inventory transactions
// @route   GET /api/inventory/transactions
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const { medicineId, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (medicineId) {
      query.medicine = medicineId;
    }

    const transactions = await InventoryTransaction.find(query)
      .populate('medicine', 'name')
      .populate('performedBy', 'fullName')
      .populate('patient', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InventoryTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search medicines for auto-suggestions
// @route   GET /api/inventory/medicines/search/suggestions
// @access  Private
export const getMedicineSuggestions = async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const searchQuery = query.trim();
    const medicines = await Medicine.find({
      $and: [
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { genericName: { $regex: searchQuery, $options: 'i' } },
            { brandName: { $regex: searchQuery, $options: 'i' } }
          ]
        },
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } }
          ]
        }
      ]
    })
      .select('name genericName brandName form strength')
      .limit(parseInt(limit))
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: medicines || []
    });
  } catch (error) {
    console.error('Error in getMedicineSuggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Deduct medicine stock for prescription
// @route   POST /api/inventory/deduct-prescription
// @access  Private
export const deductPrescriptionStock = async (medicines, patientId, userId) => {
  try {
    const transactions = [];

    for (const med of medicines) {
      const medicine = await Medicine.findOne({
        name: { $regex: new RegExp(`^${med.name}$`, 'i') },
        isActive: true
      });

      if (medicine && medicine.stockQuantity > 0) {
        const quantityToDeduct = 1; // Assuming 1 unit per prescription
        const previousStock = medicine.stockQuantity;
        const newStock = Math.max(0, previousStock - quantityToDeduct);

        medicine.stockQuantity = newStock;
        await medicine.save();

        // Create transaction
        const transaction = await InventoryTransaction.create({
          medicine: medicine._id,
          transactionType: 'prescription',
          quantity: -quantityToDeduct,
          previousStock,
          newStock,
          patient: patientId,
          prescription: patientId,
          performedBy: userId,
          notes: `Prescribed: ${med.name} - ${med.dosage}`
        });

        transactions.push(transaction);
      }
    }

    return { success: true, transactions };
  } catch (error) {
    console.error('Error deducting prescription stock:', error);
    return { success: false, error: error.message };
  }
};

