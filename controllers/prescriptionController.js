import Patient from '../models/Patient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { sendWhatsAppMessage } from '../utils/sendWhatsApp.js';

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
    const { diagnosis, medicines, notes, pdfData } = req.body;

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

    // Update prescription
    patient.prescription = {
      diagnosis,
      medicines,
      notes: notes || '',
      createdAt: new Date(),
      pdfPath: pdfPath || patient.prescription?.pdfPath || null
    };

    patient.status = 'completed';

    await patient.save();
    await patient.populate('doctor', 'fullName specialization qualification');

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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get patient by ID
// @route   GET /api/prescription/patient/:patientId
// @access  Private
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId)
      .populate('doctor', 'fullName specialization qualification email');

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
      // Search by patient ID
      query._id = patientId;
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
      .populate('doctor', 'fullName specialization qualification email')
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
        disease: patient.disease
      },
      doctor: patient.doctor ? {
        name: patient.doctor.fullName,
        specialization: patient.doctor.specialization,
        qualification: patient.doctor.qualification
      } : null,
      prescription: patient.prescription ? {
        diagnosis: patient.prescription.diagnosis,
        medicines: patient.prescription.medicines || [],
        notes: patient.prescription.notes || '',
        pdfPath: patient.prescription.pdfPath || null,
        createdAt: patient.prescription.createdAt || patient.registrationDate
      } : null,
      visitDetails: {
        fees: patient.fees,
        feeStatus: patient.feeStatus,
        isRecheck: patient.isRecheck,
        status: patient.status
      }
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
