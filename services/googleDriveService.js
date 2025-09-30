const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        // Prefer Service Account key (JSON) if provided; fallback to OAuth2 + refresh token
        let keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const inlineKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        // Fallback: look for a local key file in project root (backend)
        if (!keyFilePath && !inlineKeyJson) {
            const defaultKeyPath = path.join(__dirname, '..', 'google-drive-key.json');
            if (fs.existsSync(defaultKeyPath)) {
                keyFilePath = defaultKeyPath;
                console.log('Using local Google Drive key file at', keyFilePath);
            }
        }

        if (keyFilePath || inlineKeyJson) {
            let authConfig;
            if (inlineKeyJson) {
                // Write inline JSON to a temp file once per process
                const tmpPath = path.join(process.cwd(), '.gdrive_sa_key.tmp.json');
                if (!fs.existsSync(tmpPath)) {
                    fs.writeFileSync(tmpPath, inlineKeyJson, { encoding: 'utf8' });
                }
                authConfig = { keyFile: tmpPath };
            } else {
                authConfig = { keyFile: keyFilePath };
            }

            const scopes = ['https://www.googleapis.com/auth/drive.file'];
            this.auth = new google.auth.GoogleAuth({ ...authConfig, scopes });
            this.drive = google.drive({ version: 'v3', auth: this.auth });
        } else {
            // Initialize the OAuth2 client using refresh token flow
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
            if (!refreshToken) {
                console.error('Neither service account key nor GOOGLE_REFRESH_TOKEN provided');
                throw new Error('Google Drive auth is not configured');
            }

            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
            this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        }

        // Verify root folder exists
        const rootFolderId = 'google-drive';
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
