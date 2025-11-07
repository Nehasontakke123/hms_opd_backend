import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Medicine from '../models/Medicine.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to extract form from pack_size_label
const extractForm = (packSizeLabel) => {
  if (!packSizeLabel) return 'Other';
  const label = packSizeLabel.toLowerCase();
  if (label.includes('tablet')) return 'Tablet';
  if (label.includes('capsule')) return 'Capsule';
  if (label.includes('syrup')) return 'Syrup';
  if (label.includes('injection')) return 'Injection';
  if (label.includes('cream')) return 'Cream';
  if (label.includes('ointment')) return 'Ointment';
  if (label.includes('drop')) return 'Drops';
  if (label.includes('inhaler')) return 'Inhaler';
  return 'Other';
};

// Helper function to extract strength from composition
const extractStrength = (composition1, composition2) => {
  const compositions = [composition1, composition2].filter(c => c && c.trim());
  if (compositions.length === 0) return '';
  
  // Try to extract strength from patterns like "DrugName (500mg)" or "DrugName 500mg"
  const strengthPattern = /\(?(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|%))\)?/gi;
  const strengths = [];
  
  compositions.forEach(comp => {
    const matches = comp.match(strengthPattern);
    if (matches) {
      strengths.push(...matches.map(m => m.replace(/[()]/g, '').trim()));
    }
  });
  
  return strengths.length > 0 ? strengths.join(' + ') : '';
};

// Helper function to combine compositions
const combineCompositions = (comp1, comp2) => {
  const parts = [comp1, comp2].filter(c => c && c.trim());
  return parts.join(' + ').trim();
};

const importMedicines = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Read JSON file
    const jsonPath = path.join(__dirname, '../../frontend/src/utils/indian_medicine_data.json');
    console.log(`📖 Reading JSON file from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found at: ${jsonPath}`);
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 Found ${jsonData.length} medicines in JSON file`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 1000;

    // Process in batches to avoid memory issues
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      const medicinesToInsert = [];

      for (const item of batch) {
        try {
          // Check if medicine already exists (by name)
          const existingMedicine = await Medicine.findOne({
            name: { $regex: new RegExp(`^${item.name}$`, 'i') },
            source: 'imported'
          });

          if (existingMedicine) {
            skipped++;
            continue;
          }

          // Extract form from pack_size_label
          const form = extractForm(item['pack_size_label']);

          // Extract strength from compositions
          const strength = extractStrength(
            item['short_composition1'] || '',
            item['short_composition2'] || ''
          );

          // Combine compositions for genericName/description
          const genericName = combineCompositions(
            item['short_composition1'] || '',
            item['short_composition2'] || ''
          );

          // Parse price (remove ₹ symbol and convert to number)
          const priceStr = item['price(₹)'] || item['price'] || '0';
          const price = parseFloat(priceStr.replace(/[₹,\s]/g, '')) || 0;

          // Map Is_discontinued to isActive (inverse)
          const isActive = item['Is_discontinued']?.toUpperCase() !== 'TRUE';

          // Create medicine object
          const medicineData = {
            name: item.name?.trim() || 'Unknown Medicine',
            genericName: genericName || undefined,
            manufacturer: item['manufacturer_name']?.trim() || undefined,
            form: form,
            strength: strength || undefined,
            price: price,
            category: item['type']?.trim() || undefined,
            isActive: isActive,
            source: 'imported',
            importedData: {
              id: item.id,
              originalPrice: item['price(₹)'] || item['price'],
              packSizeLabel: item['pack_size_label'],
              shortComposition1: item['short_composition1'],
              shortComposition2: item['short_composition2'],
              type: item['type'],
              isDiscontinued: item['Is_discontinued']
            },
            stockQuantity: 0, // Default stock
            minStockLevel: 10,
            maxStockLevel: 1000
          };

          medicinesToInsert.push(medicineData);
        } catch (error) {
          console.error(`❌ Error processing medicine ${item.name}:`, error.message);
          errors++;
        }
      }

      // Bulk insert batch
      if (medicinesToInsert.length > 0) {
        await Medicine.insertMany(medicinesToInsert, { ordered: false });
        imported += medicinesToInsert.length;
        console.log(`✅ Imported batch: ${imported}/${jsonData.length} medicines`);
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`✅ Imported: ${imported} medicines`);
    console.log(`⏭️  Skipped (already exists): ${skipped} medicines`);
    console.log(`❌ Errors: ${errors} medicines`);
    console.log(`📊 Total processed: ${jsonData.length} medicines`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

importMedicines();




