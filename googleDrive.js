// services/googleDrive.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to your service account key file (downloaded from Google Cloud Console)
const KEYFILEPATH = path.join(__dirname, '../credentials.json');

// Scopes for Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Load service account credentials
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// Create Drive API client
const driveService = google.drive({ version: 'v3', auth });

/**
 * List first 5 files in Google Drive
 */
async function getFiles() {
  try {
    const response = await driveService.files.list({
      pageSize: 5,
      fields: 'files(id, name)',
    });
    console.log('Response:', response);
    const files = response.data.files;
    console.log('Files:', files);
    if (files.length === 0) {
      console.log('No files found.');
      return [];
    }

    console.log('Files:');
    files.forEach((file) => {
      console.log(`${file.name} (${file.id})`);
    });

    return files;
  } catch (err) {
    console.error('Error listing files:', err);
    throw err;
  }
}

async function createFolder(folderName, parentFolderId = null) {

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
  await driveService.files.delete({ fileId });
}


module.exports = {
  getFiles,
  createFolder,
  deleteFile
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

//   console.log('File uploaded. File ID:', response.data.id);
//   return response.data;
// }

// async function deleteFile(auth, fileId) {
//   const drive = google.drive({ version: 'v3', auth });
//   await drive.files.delete({ fileId });
//   console.log('File deleted successfully.');
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

//   console.log('File updated successfully. File ID:', response.data.id);
//   return response.data;
// }