import Patient from '../models/Patient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

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
    await patient.populate('doctor', 'fullName specialization');

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
      .populate('doctor', 'fullName specialization email');

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
