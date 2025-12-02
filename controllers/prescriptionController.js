import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { sendWhatsAppMessage } from '../utils/sendWhatsApp.js';
import { deductPrescriptionStock } from './inventoryController.js';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure medical section directory exists (used as fallback when Cloudinary is not configured)
const medicalSectionPath = path.join(__dirname, '../medical_records');

const ensureMedicalDir = async () => {
  try {
    await fs.access(medicalSectionPath);
  } catch {
    await fs.mkdir(medicalSectionPath, { recursive: true });
  }
};

// @desc    Create/Update prescription
// @route   PUT /api/prescription/:patientId
// @access  Private/Doctor
export const createPrescription = async (req, res) => {
  try {
    const { diagnosis, medicines, notes, pdfData, inventoryItems, selectedTests } = req.body;

    const normalizeField = (value) => {
      if (value === undefined || value === null) return '';
      return String(value);
    };

    // Validation
    if (!diagnosis || !medicines || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide diagnosis and at least one medicine'
      });
    }

    const patient = await Patient.findById(req.params.patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    let pdfPath = null;

    // Save/upload PDF if provided
    if (pdfData) {
      try {
        // Convert base64 to buffer (handle optional filename parameter)
        const base64Data = pdfData.replace(/^data:application\/pdf(?:;filename=[^;]+)?;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        const date = new Date().toISOString().split('T')[0];
        const patientName = patient.fullName.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const publicId = `prescriptions/prescription_${patientName}_${patient.tokenNumber}_${date}`;

        // If Cloudinary configured, upload there (works on Vercel/any stateless host)
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
          });

          const uploadResult = await new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
              {
                public_id: publicId,
                resource_type: 'raw', // pdf
                overwrite: true
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            upload.end(pdfBuffer);
          });

          pdfPath = uploadResult.secure_url; // store absolute URL
        } else {
          // Fallback: save to local filesystem (works on persistent hosts)
          await ensureMedicalDir();
          const fileName = `${publicId.split('/').pop()}.pdf`;
          const filePath = path.join(medicalSectionPath, fileName);
          await fs.writeFile(filePath, pdfBuffer);
          pdfPath = `/medical_records/${fileName}`;
        }
      } catch (pdfError) {
        console.error('Error saving/uploading PDF:', pdfError);
        // Continue even if PDF save/upload fails
      }
    }

    // Normalize and save medicines with all fields
    const normalizedMedicines = Array.isArray(medicines) ? medicines.map(med => ({
      name: normalizeField(med.name),
      dosage: normalizeField(med.dosage),
      duration: normalizeField(med.duration),
      times: med.times ? {
        morning: Boolean(med.times.morning),
        afternoon: Boolean(med.times.afternoon),
        night: Boolean(med.times.night)
      } : undefined,
      dosageInstructions: normalizeField(med.dosageInstructions || med.instructions),
      instructions: normalizeField(med.instructions || med.dosageInstructions),
      dosePattern: normalizeField(med.dosePattern || med.frequencyPattern || med.frequency),
      frequencyPattern: normalizeField(med.frequencyPattern || med.dosePattern || med.frequency),
      frequency: normalizeField(med.frequency || med.dosePattern || med.frequencyPattern)
    })) : [];

    // Update prescription
    patient.prescription = {
      diagnosis,
      medicines: normalizedMedicines,
      notes: notes || '',
      inventoryItems: Array.isArray(inventoryItems)
        ? inventoryItems.map(item => ({
            name: normalizeField(item.name),
            code: normalizeField(item.code),
            usage: normalizeField(item.usage),
            dosage: normalizeField(item.dosage)
          }))
        : [],
      selectedTests: Array.isArray(selectedTests) ? selectedTests : [],
      createdAt: new Date(),
      pdfPath: pdfPath || patient.prescription?.pdfPath || null
    };

    patient.status = 'completed';

    await patient.save();
    await patient.populate('doctor', 'fullName specialization qualification clinicAddress mobileNumber');

    // Update inventory - deduct stock for prescribed medicines
    try {
      await deductPrescriptionStock(medicines, patient._id, req.user._id);
    } catch (inventoryError) {
      console.error('Error updating inventory:', inventoryError);
      // Don't fail the prescription if inventory update fails
    }

    // Send WhatsApp notification about prescription
    const whatsappConfigured = Boolean((process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID) && (process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN) && process.env.TWILIO_WHATSAPP_FROM);

    if (whatsappConfigured) {
      try {
        const specializationLabel = patient.doctor.specialization ? ` (${patient.doctor.specialization})` : '';
        
        // Format medicines list
        const medicinesList = medicines.map((med, index) => {
          const times = [];
          if (med.times?.morning) times.push('Morning');
          if (med.times?.afternoon) times.push('Afternoon');
          if (med.times?.night) times.push('Night');
          const timeLabel = times.length > 0 ? ` - ${times.join(', ')}` : '';
          return `${index + 1}. ${med.name} - ${med.dosage}${timeLabel} (${med.duration})`;
        }).join('\n');

        const whatsappMessage = `Hello ${patient.fullName},\n\nYour prescription from Dr. ${patient.doctor.fullName}${specializationLabel} is ready.\n\n📋 Diagnosis: ${diagnosis}\n\n💊 Prescribed Medicines:\n${medicinesList}\n\n${notes ? `📝 Notes: ${notes}\n\n` : ''}Your prescription has been saved. Please collect your medicines and follow the instructions carefully.\n\nThank you,\nTekisky Hospital`;

        const whatsappResult = await sendWhatsAppMessage(patient.mobileNumber, whatsappMessage);

        if (!whatsappResult.success) {
          console.warn('[WhatsApp] Prescription notification not sent:', whatsappResult.reason || 'unknown reason');
        }
      } catch (whatsAppError) {
        console.error('[WhatsApp] Failed to send prescription notification:', whatsAppError.message || whatsAppError);
      }
    } else {
      console.warn('[WhatsApp] Skipping prescription notification because TWILIO credentials are not fully configured.');
    }

    res.status(200).json({
      success: true,
      data: patient,
      message: pdfPath ? 'Prescription saved and PDF stored in medical section' : 'Prescription saved'
    });
  } catch (error) {
    console.error('[Prescription Controller] Error:', error);
    console.error('[Prescription Controller] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// @desc    Get patient by ID
// @route   GET /api/prescription/patient/:patientId
// @access  Private
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId)
      .populate('doctor', 'fullName specialization qualification email clinicAddress mobileNumber');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get patient medical history by name, mobile number, or patient ID
// @route   GET /api/prescription/medical-history
// @access  Private
export const getMedicalHistory = async (req, res) => {
  try {
    const { patientId, mobileNumber, fullName } = req.query;

    // Build query based on provided parameters
    let query = {};
    
    if (patientId) {
      // Support searching by Mongo ObjectId or unique patientId string (e.g., TH-PT-000018)
      const trimmedPatientId = patientId.trim();
      const searchConditions = [];

      if (mongoose.Types.ObjectId.isValid(trimmedPatientId)) {
        searchConditions.push({ _id: trimmedPatientId });
      }

      const patientIdRegex = new RegExp(`^${trimmedPatientId}$`, 'i');
      searchConditions.push({ patientId: patientIdRegex });

      query = searchConditions.length === 1 ? searchConditions[0] : { $or: searchConditions };
    } else if (mobileNumber) {
      // Search by mobile number (case-insensitive, partial match)
      query.mobileNumber = { $regex: mobileNumber.trim(), $options: 'i' };
    } else if (fullName) {
      // Search by full name (case-insensitive, partial match)
      query.fullName = { $regex: fullName.trim(), $options: 'i' };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide patientId, mobileNumber, or fullName'
      });
    }

    // Find all patient records matching the query
    // Populate doctor information and sort by registration date (newest first)
    const patients = await Patient.find(query)
      .populate('doctor', 'fullName specialization qualification email clinicAddress mobileNumber')
      .sort({ registrationDate: -1 })
      .select('-__v');

    if (!patients || patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No medical history found for this patient'
      });
    }

    // Format medical history records
    const medicalHistory = patients.map(patient => ({
      patientId: patient._id,
      visitDate: patient.registrationDate,
      tokenNumber: patient.tokenNumber,
      patientInfo: {
        fullName: patient.fullName,
        mobileNumber: patient.mobileNumber,
        address: patient.address,
        age: patient.age,
        gender: patient.gender,
        disease: patient.disease,
        patientId: patient.patientId // Unique Patient ID
      },
      doctor: patient.doctor
        ? {
            name: patient.doctor.fullName,
            specialization: patient.doctor.specialization,
            qualification: patient.doctor.qualification,
            email: patient.doctor.email
          }
        : null,
      vitals: {
        bloodPressure: patient.bloodPressure,
        sugarLevel: patient.sugarLevel
      },
      prescription: patient.prescription
        ? {
            diagnosis: patient.prescription.diagnosis,
            medicines: patient.prescription.medicines || [],
            inventoryItems: patient.prescription.inventoryItems || [],
            notes: patient.prescription.notes || '',
            pdfPath: patient.prescription.pdfPath || null,
            selectedTests: patient.prescription.selectedTests || [],
            createdAt: patient.prescription.createdAt || patient.registrationDate
          }
        : null,
      visitDetails: {
        fees: patient.fees,
        feeStatus: patient.feeStatus,
        isRecheck: patient.isRecheck,
        status: patient.status
      },
      behaviorRating: patient.behaviorRating || null
    }));

    // Get unique patient info from the first record (most recent)
    const patientInfo = medicalHistory.length > 0 ? medicalHistory[0].patientInfo : null;

    res.status(200).json({
      success: true,
      data: {
        patientInfo,
        medicalHistory,
        totalVisits: medicalHistory.length
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

// @desc    Generate prescription PDF using Puppeteer and template
// @route   POST /api/prescription/generate
// @access  Private/Doctor
export const generatePrescriptionPDF = async (req, res) => {
  let browser = null;
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    // Fetch patient with doctor info
    const patient = await Patient.findById(patientId)
      .populate('doctor', 'fullName specialization qualification clinicAddress mobileNumber');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (!patient.prescription) {
      return res.status(400).json({
        success: false,
        message: 'No prescription found for this patient'
      });
    }

    // Get template file path
    const templatePath = path.join(__dirname, '../templates/prescription-template.html');
    
    // Log template path
    console.log('[PDF Generation] Template path:', templatePath);
    console.log('[PDF Generation] Template exists:', fsSync.existsSync(templatePath));

    // Read template file
    let templateHtml;
    try {
      templateHtml = fsSync.readFileSync(templatePath, 'utf8');
      console.log('[PDF Generation] Template loaded successfully. First 200 chars:', templateHtml.substring(0, 200));
    } catch (templateError) {
      console.error('[PDF Generation] Error reading template file:', templateError);
      console.error('[PDF Generation] Stack:', templateError.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to load prescription template',
        error: process.env.NODE_ENV === 'development' ? templateError.message : 'Template loading error'
      });
    }

    // Prepare data for template
    const doctor = patient.doctor || {};
    const prescription = patient.prescription;

    // Format date - use prescription date if available, otherwise fallback to today
    let dateValue;
    if (prescription?.createdAt) {
      // Use prescription creation date
      dateValue = new Date(prescription.createdAt);
    } else if (patient?.registrationDate) {
      // Use patient registration date
      dateValue = new Date(patient.registrationDate);
    } else {
      // Fallback to today's date
      dateValue = new Date();
    }
    
    // Format date as DD/MM/YYYY using en-IN locale
    const date = dateValue.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Format medicines HTML
    let medicinesHtml = '';
    if (prescription.medicines && Array.isArray(prescription.medicines)) {
      prescription.medicines.forEach((med, index) => {
        const morningChecked = med.times?.morning ? 'checked' : '';
        const afternoonChecked = med.times?.afternoon ? 'checked' : '';
        const nightChecked = med.times?.night ? 'checked' : '';
        
        // Generate frequency string in format: "1 – 0 – 1" (Morning – Afternoon – Night)
        const frequency = 
          (med.times?.morning ? '1' : '0') + ' – ' +
          (med.times?.afternoon ? '1' : '0') + ' – ' +
          (med.times?.night ? '1' : '0');
        
        // Build dose pattern/frequency display
        const doseInfo = med.dosage || med.dosePattern || med.frequencyPattern || med.frequency || '';
        
        medicinesHtml += `
          <div class="medicine-item">
            <span class="medicine-number">${index + 1}.</span>
            <span class="medicine-name">${escapeHtml(med.name || '')}</span>
            <div class="medicine-detail">
              ${doseInfo ? `<div class="medicine-detail-line"><strong>Dosage:</strong> ${escapeHtml(doseInfo)}</div>` : ''}
              <div class="medicine-detail-line">
                <strong>Frequency:</strong> ${frequency}
              </div>
              <div class="medicine-detail-line">
                <strong>Timing:</strong>
                <span class="timing-checkbox ${morningChecked ? 'checked' : ''}"></span> Morning
                <span class="timing-checkbox ${afternoonChecked ? 'checked' : ''}"></span> Afternoon
                <span class="timing-checkbox ${nightChecked ? 'checked' : ''}"></span> Night
              </div>
              ${med.duration ? `<div class="medicine-detail-line"><strong>Duration:</strong> ${escapeHtml(med.duration)}</div>` : ''}
              ${(med.instructions || med.dosageInstructions) ? `<div class="medicine-detail-line"><strong>Instructions:</strong> ${escapeHtml(med.instructions || med.dosageInstructions)}</div>` : ''}
            </div>
          </div>
        `;
      });
    }

    // Format tests HTML
    let testsHtml = '';
    if (prescription.selectedTests && Array.isArray(prescription.selectedTests)) {
      prescription.selectedTests.forEach(test => {
        testsHtml += `<div class="test-item">• ${escapeHtml(test)}</div>`;
      });
    }

    // Format additional notes - include diagnosis if available
    let additionalNotes = '';
    if (prescription.diagnosis) {
      additionalNotes += `<div><strong>Diagnosis:</strong> ${escapeHtml(prescription.diagnosis)}</div>`;
    }
    if (prescription.notes) {
      additionalNotes += `<div style="margin-top: 3mm;">${escapeHtml(prescription.notes)}</div>`;
    }

    // Format signature and stamp - only include if values exist
    let signatureHtml = '';
    if (prescription.doctorSignatureUrl && prescription.doctorSignatureUrl.trim() !== '') {
      signatureHtml = `<img src="${escapeHtml(prescription.doctorSignatureUrl)}" alt="Doctor Signature" />`;
    }

    let stampHtml = '';
    if (prescription.clinicStampUrl && prescription.clinicStampUrl.trim() !== '') {
      stampHtml = `<img src="${escapeHtml(prescription.clinicStampUrl)}" alt="Clinic Stamp" />`;
    }
    
    // Also check if signature/stamp URLs are passed directly (from user profile)
    const doctorSignatureUrl = prescription.doctorSignatureUrl || doctor.signatureImage || '';
    const clinicStampUrl = prescription.clinicStampUrl || doctor.stampImage || '';
    
    if (doctorSignatureUrl && doctorSignatureUrl.trim() !== '' && !signatureHtml) {
      signatureHtml = `<img src="${escapeHtml(doctorSignatureUrl)}" alt="Doctor Signature" />`;
    }
    
    if (clinicStampUrl && clinicStampUrl.trim() !== '' && !stampHtml) {
      stampHtml = `<img src="${escapeHtml(clinicStampUrl)}" alt="Clinic Stamp" />`;
    }

    // Format doctor name with "Dr." prefix if not already present
    let doctorName = doctor.fullName || 'Dr. Unknown';
    if (doctorName && !doctorName.toUpperCase().startsWith('DR.') && !doctorName.startsWith('Dr.')) {
      doctorName = `DR. ${doctorName.toUpperCase()}`;
    } else if (doctorName) {
      doctorName = doctorName.toUpperCase();
    }

    // Replace placeholders in template
    let html = templateHtml
      .replace(/\{\{doctorName\}\}/g, escapeHtml(doctorName))
      .replace(/\{\{doctorQualifications\}\}/g, escapeHtml(doctor.qualification || ''))
      .replace(/\{\{doctorSpeciality\}\}/g, escapeHtml(doctor.specialization || 'General Physician'))
      .replace(/\{\{doctorRegNo\}\}/g, escapeHtml(doctor.registrationNumber || 'N/A'))
      .replace(/\{\{patientName\}\}/g, escapeHtml(patient.fullName || ''))
      .replace(/\{\{patientWeight\}\}/g, escapeHtml(patient.weight || patient.prescription?.weight || ''))
      .replace(/\{\{patientAge\}\}/g, escapeHtml(String(patient.age || '')))
      .replace(/\{\{patientSex\}\}/g, escapeHtml(patient.gender || ''))
      .replace(/\{\{date\}\}/g, escapeHtml(date))
      .replace(/\{\{medicines\}\}/g, medicinesHtml || '<div style="font-style: italic; color: #666;">No medicines prescribed.</div>')
      .replace(/\{\{tests\}\}/g, testsHtml || '<div style="font-style: italic; color: #666;">No tests prescribed.</div>')
      .replace(/\{\{additionalNotes\}\}/g, additionalNotes || '')
      .replace(/\{\{doctorSignatureUrl\}\}/g, signatureHtml.trim() || '')
      .replace(/\{\{clinicStampUrl\}\}/g, stampHtml.trim() || '');

    // Log HTML snippet before Puppeteer
    console.log('[PDF Generation] HTML prepared. First 200 chars:', html.substring(0, 200));
    console.log('[PDF Generation] Starting Puppeteer browser...');

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for fonts/resources
    console.log('[PDF Generation] Setting page content...');
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    console.log('[PDF Generation] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    console.log('[PDF Generation] PDF generated successfully. Size:', pdfBuffer.length, 'bytes');

    // Close browser
    await browser.close();
    browser = null;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber}.pdf"`);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF Generation] Error:', error);
    console.error('[PDF Generation] Stack:', error.stack);
    
    // Close browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF Generation] Error closing browser:', closeError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate prescription PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'PDF generation error'
    });
  }
};

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
