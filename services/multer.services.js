import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinaryConfig.js';
import path from 'path';
const allowedFileTypes = ['.jpg', '.png', '.gif', '.pdf', '.jpeg', '.mp4', '.mp3', '.wav', '.ogg', '.flac'];
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName;

    switch (file.fieldname) {
      case 'signature' :
        folderName = "signatureImages";
      case 'hospitalLogo' :
        folderName = 'hospitalLogoImages';
        break;
      case 'profilePicture':
        folderName = 'profileImages';
        break;
      default:
        folderName = 'others';
    }

    return {
      folder: folderName,
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
      resource_type: 'auto',
    };
  }
});

const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(extname)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid Image Type'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export default upload;
