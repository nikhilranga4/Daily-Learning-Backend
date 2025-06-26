// services/googleDriveService.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Check if environment variables are available
      if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        console.log('Initializing Google Drive with environment variables...');

        // Create credentials object
        const credentials = {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || 'key-id',
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
        };

        // Try Service Account first (most reliable)
        if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
          console.log('🔑 Using Service Account authentication...');

          this.auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            [
              'https://www.googleapis.com/auth/drive.file',
              'https://www.googleapis.com/auth/drive'
            ]
          );

        // Fallback to OAuth if service account fails
        } else if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
          console.log('🔄 Using OAuth tokens...');

          this.auth = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'http://localhost:3000/oauth2callback'
          );

          // Set initial credentials
          this.auth.setCredentials({
            access_token: process.env.GOOGLE_ACCESS_TOKEN,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
          });

          // Set up automatic token refresh with better error handling
          this.auth.on('tokens', (tokens) => {
            if (tokens.access_token) {
              console.log('✅ OAuth access token refreshed successfully');
              process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
            }
            if (tokens.refresh_token) {
              console.log('✅ OAuth refresh token updated');
              process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
            }
          });

          // Enable automatic token refresh
          this.auth.forceRefreshOnFailure = true;

          // Set up periodic token refresh
          this.setupTokenRefresh();

        } else if (process.env.GOOGLE_DRIVE_USER_EMAIL) {
          console.log('🔄 Using domain-wide delegation for:', process.env.GOOGLE_DRIVE_USER_EMAIL);

          this.auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            [
              'https://www.googleapis.com/auth/drive.file',
              'https://www.googleapis.com/auth/drive'
            ],
            process.env.GOOGLE_DRIVE_USER_EMAIL // Impersonate this user
          );
        } else {
          // Fallback to regular service account
          this.auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
              'https://www.googleapis.com/auth/drive.file',
              'https://www.googleapis.com/auth/drive'
            ]
          });
        }

        // Get authenticated client
        if (this.auth.getClient) {
          const authClient = await this.auth.getClient();
          this.drive = google.drive({ version: 'v3', auth: authClient });
        } else {
          // Direct auth object (for OAuth2 and JWT)
          this.drive = google.drive({ version: 'v3', auth: this.auth });
        }

        console.log('✅ Google Drive service initialized successfully with environment variables');

        // Test the connection
        await this.testConnection();

      } else {
        // Fallback to service account file
        console.log('Environment variables not found, trying service account file...');
        this.auth = new google.auth.GoogleAuth({
          keyFile: path.join(__dirname, '../config/google-service-account.json'),
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive'
          ]
        });

        if (this.auth.getClient) {
          const authClient = await this.auth.getClient();
          this.drive = google.drive({ version: 'v3', auth: authClient });
        } else {
          this.drive = google.drive({ version: 'v3', auth: this.auth });
        }
        console.log('✅ Google Drive service initialized with service account file');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error.message);
      console.log('📝 File uploads will not work, but text messages will still function');
      this.drive = null;
    }
  }

  setupTokenRefresh() {
    // Refresh token every 45 minutes (before 1-hour expiration)
    const refreshInterval = 45 * 60 * 1000; // 45 minutes in milliseconds

    setInterval(async () => {
      try {
        if (this.auth && this.auth.refreshAccessToken) {
          console.log('🔄 Proactively refreshing OAuth token...');

          // Get new access token
          const { credentials } = await this.auth.refreshAccessToken();

          if (credentials.access_token) {
            console.log('✅ Token refreshed successfully');
            process.env.GOOGLE_ACCESS_TOKEN = credentials.access_token;

            // Test the new token
            await this.testConnection();
          }
        }
      } catch (error) {
        console.error('❌ Scheduled token refresh failed:', error.message);

        // Try to get fresh tokens if refresh fails
        if (error.message.includes('invalid_grant') || error.message.includes('internal_failure')) {
          console.log('🔧 Refresh token may be expired. Manual token update required.');
          console.log('📝 Please get new tokens from: https://developers.google.com/oauthplayground/');

          // Disable Google Drive temporarily
          this.drive = null;
        }
      }
    }, refreshInterval);

    console.log(`⏰ Automatic token refresh scheduled every ${refreshInterval / 60000} minutes`);
  }

  async testConnection() {
    try {
      // Test the connection by creating a simple query
      const response = await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });

      console.log('✅ Google Drive connection test successful');
      console.log(`📁 Drive access confirmed - can list files`);

      // Test folder access if folder ID is provided
      if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
        await this.testFolderAccess();
      }

      return true;
    } catch (error) {
      console.error('❌ Google Drive connection test failed:', error.message);

      if (error.message.includes('unregistered callers')) {
        console.log('🔧 Solution: Enable Google Drive API in Google Cloud Console');
        console.log('📝 Go to: https://console.cloud.google.com/apis/library/drive.googleapis.com');
      } else if (error.message.includes('authentication credential')) {
        console.log('🔧 Solution: Check service account credentials and permissions');
        console.log('📝 Ensure the service account has proper Drive access');
      } else if (error.message.includes('internal_failure')) {
        console.log('🔧 OAuth tokens may have expired or Google API temporary issue');
        console.log('📝 Attempting automatic token refresh...');

        // Try to refresh token automatically
        try {
          if (this.auth && this.auth.refreshAccessToken) {
            const { credentials } = await this.auth.refreshAccessToken();

            if (credentials.access_token) {
              console.log('✅ Token refreshed successfully, retrying connection...');
              process.env.GOOGLE_ACCESS_TOKEN = credentials.access_token;

              // Retry the connection test once
              return await this.testConnection();
            }
          }
        } catch (refreshError) {
          console.error('❌ Failed to refresh token:', refreshError.message);

          if (refreshError.message.includes('invalid_grant')) {
            console.log('🚨 Refresh token has expired!');
            console.log('📝 Please get new tokens from: https://developers.google.com/oauthplayground/');
            console.log('🔧 Steps:');
            console.log('   1. Go to https://developers.google.com/oauthplayground/');
            console.log('   2. Select "Drive API v3" scope');
            console.log('   3. Authorize and get new tokens');
            console.log('   4. Update your .env file with new tokens');
          }
        }
      }

      // Don't throw error - let the service continue without file uploads
      console.log('📝 File uploads will use local storage fallback');
      console.log('💡 Google Drive uploads will be disabled until connection is restored');
      this.drive = null; // Disable drive functionality
      return false;
    }
  }

  async testFolderAccess() {
    try {
      let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (folderId.includes('drive.google.com')) {
        const match = folderId.match(/folders\/([a-zA-Z0-9-_]+)/);
        if (match) {
          folderId = match[1];
        }
      }

      console.log(`🔍 Testing access to folder: ${folderId}`);

      // Try to get folder metadata
      const folderResponse = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, permissions',
        supportsAllDrives: true
      });

      console.log(`✅ Folder access confirmed: ${folderResponse.data.name}`);

      // Try to list files in the folder
      const filesResponse = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: 'files(id, name)',
        supportsAllDrives: true
      });

      console.log(`📂 Can list folder contents (${filesResponse.data.files.length} files visible)`);

    } catch (error) {
      console.error('❌ Folder access test failed:', error.message);

      if (error.message.includes('File not found')) {
        console.log('💡 The service account cannot access this folder');
        console.log('💡 Please share the folder with: daily-learning@booming-monitor-345118.iam.gserviceaccount.com');
        console.log('💡 Make sure to give "Editor" permissions');
      }

      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      console.log(`📤 Uploading file: ${fileName} (${mimeType})`);
      console.log(`📊 File size: ${fileBuffer.length} bytes`);

      // Ensure we have a folder ID (required for service account uploads)
      if (!folderId) {
        folderId = await this.getChatFilesFolder();
        if (!folderId) {
          throw new Error('No folder ID available for upload. Please ensure GOOGLE_DRIVE_FOLDER_ID is set.');
        }
      }

      console.log(`📁 Uploading to folder: ${folderId}`);

      // Convert buffer to readable stream
      const { Readable } = require('stream');
      const fileStream = Readable.from(fileBuffer);

      const fileMetadata = {
        name: fileName,
        parents: [folderId] // Always specify parent folder for service accounts
      };

      const media = {
        mimeType: mimeType,
        body: fileStream
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, mimeType, webViewLink, webContentLink',
        supportsAllDrives: true, // Important for shared drives
        supportsTeamDrives: true // Legacy support
      });

      console.log(`✅ File uploaded successfully: ${response.data.id}`);

      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      console.log(`🔓 File made publicly accessible`);

      // Create different URLs for images vs files
      const isImage = mimeType.startsWith('image/');
      const downloadUrl = isImage
        ? `https://drive.google.com/uc?id=${response.data.id}` // Direct image URL
        : `https://drive.google.com/uc?id=${response.data.id}&export=download`; // Download URL for files

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        fileSize: response.data.size,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        downloadUrl: downloadUrl,
        imagePreviewUrl: isImage ? `https://drive.google.com/uc?id=${response.data.id}` : null
      };
    } catch (error) {
      console.error('❌ Error uploading file to Google Drive:', error.message);

      // Provide helpful error messages
      if (error.message.includes('storage quota')) {
        console.log('💡 Tip: Make sure you\'re uploading to a shared folder in your personal Google Drive');
        console.log('💡 The service account needs Editor access to your shared folder');
      }

      throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
    }
  }

  async deleteFile(fileId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      await this.drive.files.delete({
        fileId: fileId
      });

      return true;
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  async getFileInfo(fileId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, size, mimeType, webViewLink, webContentLink, createdTime, modifiedTime'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file info from Google Drive:', error);
      throw new Error('Failed to get file info from Google Drive');
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name'
      });

      return response.data;
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw new Error('Failed to create folder in Google Drive');
    }
  }

  // Get or create chat files folder
  async getChatFilesFolder() {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      // If specific folder ID is provided in environment, use it
      if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
        // Extract folder ID from URL if it's a full URL
        let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (folderId.includes('drive.google.com')) {
          const match = folderId.match(/folders\/([a-zA-Z0-9-_]+)/);
          if (match) {
            folderId = match[1];
          }
        }
        console.log('📁 Using specified Google Drive folder:', folderId);
        return folderId;
      }

      // Search for existing chat files folder
      const response = await this.drive.files.list({
        q: "name='Daily Learning Chat Files' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (response.data.files.length > 0) {
        console.log('📁 Found existing chat files folder:', response.data.files[0].id);
        return response.data.files[0].id;
      }

      // Create folder if it doesn't exist
      console.log('📁 Creating new chat files folder...');
      const folder = await this.createFolder('Daily Learning Chat Files');
      console.log('✅ Created chat files folder:', folder.id);
      return folder.id;
    } catch (error) {
      console.error('❌ Error getting/creating chat files folder:', error.message);
      return null;
    }
  }
}

// Create singleton instance
const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;
