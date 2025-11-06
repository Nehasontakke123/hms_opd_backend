import Medicine from '../models/Medicine.js';
import XLSX from 'xlsx';

// @desc    Import medicines from JSON (Indian Medicine Dataset format)
// @route   POST /api/admin/import-export/import/json
// @access  Private/Admin
export const importMedicinesFromJSON = async (req, res) => {
  try {
    const { medicines, overwrite = false } = req.body;

    if (!medicines || !Array.isArray(medicines)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected an array of medicines.'
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const medData of medicines) {
      try {
        // Map Indian Medicine Dataset format to our schema
        const medicineData = {
          name: medData.name || medData.medicine_name || medData.drug_name,
          genericName: medData.generic_name || medData.generic || '',
          brandName: medData.brand_name || medData.brand || '',
          manufacturer: medData.manufacturer || medData.company || '',
          form: mapForm(medData.form || medData.type || medData.dosage_form || 'Tablet'),
          strength: medData.strength || medData.dosage || '',
          category: medData.category || medData.therapeutic_class || '',
          description: medData.description || medData.uses || '',
          price: parseFloat(medData.price || medData.cost || 0),
          stockQuantity: parseInt(medData.stock || medData.quantity || 0),
          minStockLevel: parseInt(medData.min_stock || 10),
          source: 'imported',
          importedData: medData
        };

        if (!medicineData.name) {
          results.skipped++;
          results.errors.push({ medicine: medData, error: 'Missing medicine name' });
          continue;
        }

        // Check if medicine already exists
        const existingMedicine = await Medicine.findOne({
          name: { $regex: new RegExp(`^${medicineData.name}$`, 'i') }
        });

        if (existingMedicine) {
          if (overwrite) {
            Object.assign(existingMedicine, medicineData);
            await existingMedicine.save();
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await Medicine.create(medicineData);
          results.imported++;
        }
      } catch (error) {
        results.errors.push({ medicine: medData, error: error.message });
        results.skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Import medicines from Excel file
// @route   POST /api/admin/import-export/import/excel
// @access  Private/Admin
export const importMedicinesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an Excel file (.xlsx or .xls)'
      });
    }

    // Validate file type - check both MIME type and extension
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
    
    const hasExcelExtension = /\.(xlsx|xls)$/i.test(req.file.originalname);
    const hasExcelMimeType = allowedTypes.includes(req.file.mimetype);
    
    // If it's a JSON file, provide helpful error message
    if (req.file.mimetype === 'application/json' || /\.json$/i.test(req.file.originalname)) {
      return res.status(400).json({
        success: false,
        message: 'You selected a JSON file. Please use the "Import from JSON" section instead, or convert your file to Excel format (.xlsx or .xls).'
      });
    }
    
    if (!hasExcelMimeType && !hasExcelExtension) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls). For JSON files, use the "Import from JSON" section.'
      });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Excel file. Please ensure the file is a valid Excel format (.xlsx or .xls)',
        error: parseError.message
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file has no sheets. Please ensure the file contains at least one worksheet.'
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'Could not read worksheet from Excel file.'
      });
    }

    const medicines = XLSX.utils.sheet_to_json(worksheet);

    if (medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid format'
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const medData of medicines) {
      try {
        const medicineData = {
          name: medData.Name || medData.name || medData.Medicine || medData.medicine,
          genericName: medData['Generic Name'] || medData.genericName || medData.generic || '',
          brandName: medData['Brand Name'] || medData.brandName || medData.brand || '',
          manufacturer: medData.Manufacturer || medData.manufacturer || medData.company || '',
          form: mapForm(medData.Form || medData.form || medData.Type || medData.type || 'Tablet'),
          strength: medData.Strength || medData.strength || medData.dosage || '',
          category: medData.Category || medData.category || '',
          price: parseFloat(medData.Price || medData.price || medData.cost || 0),
          stockQuantity: parseInt(medData.Stock || medData.stock || medData.Quantity || medData.quantity || 0),
          minStockLevel: parseInt(medData['Min Stock'] || medData.minStock || 10),
          source: 'imported'
        };

        if (!medicineData.name) {
          results.skipped++;
          continue;
        }

        const existingMedicine = await Medicine.findOne({
          name: { $regex: new RegExp(`^${medicineData.name}$`, 'i') }
        });

        if (existingMedicine) {
          Object.assign(existingMedicine, medicineData);
          await existingMedicine.save();
          results.updated++;
        } else {
          await Medicine.create(medicineData);
          results.imported++;
        }
      } catch (error) {
        results.errors.push({ medicine: medData, error: error.message });
        results.skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Export medicines to JSON
// @route   GET /api/admin/import-export/export/json
// @access  Private/Admin
export const exportMedicinesToJSON = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true }).select('-__v -importedData');

    res.status(200).json({
      success: true,
      data: medicines,
      count: medicines.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Export medicines to Excel
// @route   GET /api/admin/import-export/export/excel
// @access  Private/Admin
export const exportMedicinesToExcel = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true }).select('-__v -importedData');

    const worksheetData = medicines.map(med => ({
      Name: med.name,
      'Generic Name': med.genericName,
      'Brand Name': med.brandName,
      Manufacturer: med.manufacturer,
      Form: med.form,
      Strength: med.strength,
      Category: med.category,
      Price: med.price,
      Stock: med.stockQuantity,
      'Min Stock': med.minStockLevel,
      'Expiry Date': med.expiryDate ? med.expiryDate.toISOString().split('T')[0] : '',
      Batch: med.batchNumber
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=medicines_export_${new Date().toISOString().split('T')[0]}.xlsx`);

    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Sync medicine data from external source
// @route   POST /api/admin/import-export/sync
// @access  Private/Admin
export const syncMedicineData = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Fetch data from URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch data from URL');
    }

    const data = await response.json();
    
    // Process the data (assuming it's in Indian Medicine Dataset format)
    if (Array.isArray(data)) {
      const result = await importMedicinesFromJSON({ medicines: data, overwrite: false });
      return res.status(200).json({
        success: true,
        message: 'Data synchronized successfully',
        result
      });
    } else if (data.data && Array.isArray(data.data)) {
      const result = await importMedicinesFromJSON({ medicines: data.data, overwrite: false });
      return res.status(200).json({
        success: true,
        message: 'Data synchronized successfully',
        result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to map form types
const mapForm = (form) => {
  const formLower = (form || '').toLowerCase();
  if (formLower.includes('tablet')) return 'Tablet';
  if (formLower.includes('capsule')) return 'Capsule';
  if (formLower.includes('syrup') || formLower.includes('suspension')) return 'Syrup';
  if (formLower.includes('injection')) return 'Injection';
  if (formLower.includes('cream') || formLower.includes('ointment')) return 'Cream';
  if (formLower.includes('drop')) return 'Drops';
  if (formLower.includes('inhaler')) return 'Inhaler';
  return 'Tablet'; // Default
};

