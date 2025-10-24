// services/googleDrive.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to your service account key file (downloaded from Google Cloud Console)
const KEYFILEPATH = path.join(__dirname, './credentials.json');

// Scopes for Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
  
  // Create Drive API client
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

// Load service account credentials

/**
 * List first 5 files in Google Drive
 */
async function getFiles() {
  const driveService = await getDriveClient();

  try {
    const response = await driveService.files.list({
      pageSize: 5,
      fields: 'files(id, name)',
    });
    const files = response.data.files;
    if (files.length === 0) {
      return [];
    }

    files.forEach((file) => {
    });

    return files;
  } catch (err) {
    throw err;
  }
}

async function createFile(folderName, parentFolderId = null) {
  const driveService = await getDriveClient();

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  // If you want the folder inside another folder, add parents
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const response = await driveService.files.create({
    resource: fileMetadata,
    fields: 'id, name',
  });
  return response.data.id; // return folder ID
}

async function deleteFile(fileId) {
  const driveService = await getDriveClient();

  await driveService.files.delete({ fileId });
}

async function renameFile(fileId, newName) {
  const driveService = await getDriveClient();

  try {
    const response = await driveService.files.update({
      fileId,
      requestBody: {
        name: newName,
      },
      fields: "id, name",
    });

    return response.data;
  } catch (err) {
    console.error("❌ Error renaming item:", err.message);
    return null;
  }
}

async function uploadFile(filePath, originalName, folderId) {
  const driveService = await getDriveClient();
  try {
    const fileMetadata = {
      name: originalName,
      parents: [folderId],
    };
    
    const media = {
      body: fs.createReadStream(filePath),
    };
  
    const file = await driveService.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    
    return file.data.id;
  } catch (error) {
    console.error("❌ Error renaming item:", err.message);
    return null;
  }
}

module.exports = {
  getFiles,
  createFile,
  deleteFile,
  renameFile,
  uploadFile
};

// async function uploadFile(auth, filePath, folderId) {
//   const drive = google.drive({ version: 'v3', auth });

//   const fileMetadata = {
//       name: filePath.split('/').pop(),
//       parents: [folderId]
//   };

//   const media = {
//       mimeType: 'application/octet-stream',
//       body: fs.createReadStream(filePath)
//   };

//   const response = await drive.files.create({
//       resource: fileMetadata,
//       media,
//       fields: 'id'
//   });

//   return response.data;
// }

// async function deleteFile(auth, fileId) {
//   const drive = google.drive({ version: 'v3', auth });
//   await drive.files.delete({ fileId });
// }

// async function updateFile(auth, fileId, filePath) {
//   const drive = google.drive({ version: 'v3', auth });

//   const fileMetadata = {
//       name: filePath.split('/').pop()
//   };

//   const media = {
//       mimeType: 'application/octet-stream',
//       body: fs.createReadStream(filePath)
//   };

//   const response = await drive.files.update({
//       fileId,
//       resource: fileMetadata,
//       media,
//       fields: 'id'
//   });

//   return response.data;
// }