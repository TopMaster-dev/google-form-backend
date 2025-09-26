const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        // Initialize the OAuth2 client
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Set credentials using refresh token
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        if (!refreshToken) {
            console.error('GOOGLE_REFRESH_TOKEN is not set in environment variables');
            throw new Error('Google Drive refresh token is not configured');
        }

        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        // Initialize the drive client
        this.drive = google.drive({
            version: 'v3',
            auth: this.oauth2Client
        });

        // Verify root folder exists
        const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER;
        if (!rootFolderId) {
            console.error('GOOGLE_DRIVE_ROOT_FOLDER is not set in environment variables');
            throw new Error('Google Drive root folder is not configured');
        }

        console.log('GoogleDriveService initialized with root folder:', rootFolderId);
    }

    /**
     * Create a folder for a form if it doesn't exist
     * @param {string} formId - The ID of the form
     * @param {string} formTitle - The title of the form
     * @returns {Promise<string>} - The ID of the folder
     */
    async createFormFolder(formId, formTitle) {
        try {
            // Check if folder already exists
            const response = await this.drive.files.list({
                q: `name='Form_${formId}' and mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_ROOT_FOLDER}' in parents and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.data.files.length > 0) {
                return response.data.files[0].id;
            }

            // Create new folder
            const fileMetadata = {
                name: `Form_${formId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER]
            };

            const folder = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });

            return folder.data.id;
        } catch (error) {
            console.error('Error in createFormFolder:', error);
            throw error;
        }
    }

    /**
     * Upload a file to Google Drive
     * @param {string} filePath - Path to the file to upload
     * @param {string} fileName - Name to give the file in Drive
     * @param {string} folderId - ID of the folder to upload to
     * @returns {Promise<string>} - The ID of the uploaded file
     */
    async uploadFile(filePath, fileName, folderId) {
        try {
            console.log(`Attempting to upload file: ${fileName} to folder: ${folderId}`);

            // Verify file exists
            if (!fs.existsSync(filePath)) {
                console.error(`File not found at path: ${filePath}`);
                throw new Error('File not found');
            }

            const fileMetadata = {
                name: fileName,
                parents: [folderId]
            };

            const mimeType = this.getMimeType(fileName);
            console.log(`Determined MIME type: ${mimeType} for file: ${fileName}`);

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath)
            };

            console.log('Creating file in Google Drive...');
            const file = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            console.log(`File uploaded successfully. ID: ${file.data.id}`);
            return file.data.id;
        } catch (error) {
            console.error('Error in uploadFile:', error);
            throw error;
        }
    }

    /**
     * Get a shareable link for a file
     * @param {string} fileId - The ID of the file in Drive
     * @returns {Promise<string>} - The shareable link
     */
    async getShareableLink(fileId) {
        try {
            // Update file permissions to make it viewable by anyone with the link
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // Get the web view link
            const file = await this.drive.files.get({
                fileId: fileId,
                fields: 'webViewLink'
            });

            return file.data.webViewLink;
        } catch (error) {
            console.error('Error in getShareableLink:', error);
            throw error;
        }
    }

    /**
     * Get MIME type based on file extension
     * @param {string} fileName 
     * @returns {string}
     */
    getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}

module.exports = GoogleDriveService;
