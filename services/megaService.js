// services/megaService.js
require('dotenv').config();
const mega = require('megajs');
const fs = require('fs');

class MegaService {
  constructor() {
    this.email = process.env.MEGA_EMAIL;
    this.password = process.env.MEGA_PASSWORD;
  }

  async uploadFile(localPath, remoteFileName) {
    return new Promise((resolve, reject) => {
      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        const fileStream = fs.createReadStream(localPath);
        const fileStats = fs.statSync(localPath);
        const uploadStream = storage.upload({
          name: remoteFileName,
          size: fileStats.size,
          allowUploadBuffering: true
        });

        fileStream.pipe(uploadStream);

        uploadStream.on('complete', (file) => {
          if (!file) {
            return reject(new Error('Uploaded file node not found on MEGA.'));
          }

          // Use the library's official method to generate the link.
          file.link((err, url) => {
            if (err) {
              console.error('Could not generate MEGA link, but file was uploaded:', err);
              return resolve({
                success: true,
                fileName: remoteFileName,
                nodeId: file.nodeId || file.h,
                publicUrl: null
              });
            }

            console.log(`Generated public MEGA URL via file.link(): ${url}`);

            resolve({
              success: true,
              fileName: remoteFileName,
              nodeId: file.nodeId || file.h,
              publicUrl: url
            });
          });
        });

        uploadStream.on('error', (err) => {
          console.error('MEGA upload stream error:', err);
          reject(err);
        });
      });

      storage.once('error', (err) => {
        console.error('MEGA storage connection error:', err);
        reject(err);
      });
    });
  }

  /**
   * Upload a buffer (e.g., JSON data) to MEGA
   * @param {Buffer} buffer - The buffer to upload
   * @param {string} fileName - The name for the file
   * @param {string} folderPath - Optional folder path (e.g., 'user_123/llm_conversations')
   * @returns {Promise<string>} - Returns the node ID
   */
  async uploadBuffer(buffer, fileName, folderPath = '') {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com') {
        console.warn('⚠️  Mega Drive not configured, skipping upload');
        resolve(null);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          let targetFolder = storage.root;

          // Validate that storage.root exists and has children
          if (!targetFolder) {
            console.warn('⚠️  Mega Drive root folder not accessible, skipping upload');
            resolve(null);
            return;
          }

          // Wait a bit for the storage to fully initialize
          setTimeout(() => {
            try {
              if (!targetFolder.children) {
                console.warn('⚠️  Mega Drive children not loaded, skipping upload');
                resolve(null);
                return;
              }

              // Continue with the original upload logic
              this.performUpload(targetFolder, folderPath, fileName, buffer, resolve);
            } catch (error) {
              console.warn('⚠️  Error during delayed upload:', error.message);
              resolve(null);
            }
          }, 1000); // Wait 1 second for initialization

          // Create folder structure if specified
          if (folderPath) {
            const folders = folderPath.split('/').filter(f => f.trim());
            for (const folderName of folders) {
              let existingFolder = targetFolder.children.find(
                child => child.name === folderName && child.directory
              );

              if (!existingFolder) {
                // Check if mkdir method exists
                if (typeof targetFolder.mkdir === 'function') {
                  existingFolder = targetFolder.mkdir(folderName);
                } else {
                  console.warn('⚠️  Cannot create folders in Mega Drive, using root');
                  break;
                }
              }
              targetFolder = existingFolder;
            }
          }

          // Check if upload method exists
          if (typeof targetFolder.upload !== 'function') {
            console.warn('⚠️  Mega Drive upload method not available, skipping upload');
            resolve(null);
            return;
          }

          const uploadStream = targetFolder.upload({
            name: fileName,
            size: buffer.length,
            allowUploadBuffering: true
          });

          uploadStream.on('complete', (file) => {
            if (!file) {
              console.warn('⚠️  Upload completed but file node not found');
              resolve(null);
              return;
            }

            console.log(`✅ Successfully uploaded ${fileName} to MEGA`);
            resolve(file.nodeId || file.h);
          });

          uploadStream.on('error', (err) => {
            console.warn('⚠️  Upload stream error:', err.message);
            resolve(null); // Don't reject, just skip upload
          });

          // Write buffer to upload stream
          uploadStream.write(buffer);
          uploadStream.end();

        } catch (error) {
          console.warn('⚠️  Error during buffer upload:', error.message);
          resolve(null); // Don't reject, just skip upload
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  MEGA storage connection error:', err.message);
        resolve(null); // Don't reject, just skip upload
      });
    });
  }

  /**
   * Helper method to perform the actual upload
   */
  performUpload(targetFolder, folderPath, fileName, buffer, resolve) {
    try {
      // Create folder structure if specified
      if (folderPath) {
        const folders = folderPath.split('/').filter(f => f.trim());
        for (const folderName of folders) {
          let existingFolder = targetFolder.children.find(
            child => child.name === folderName && child.directory
          );

          if (!existingFolder) {
            // Check if mkdir method exists
            if (typeof targetFolder.mkdir === 'function') {
              existingFolder = targetFolder.mkdir(folderName);
            } else {
              console.warn('⚠️  Cannot create folders in Mega Drive, using root');
              break;
            }
          }
          targetFolder = existingFolder;
        }
      }

      // Check if upload method exists
      if (typeof targetFolder.upload !== 'function') {
        console.warn('⚠️  Mega Drive upload method not available, skipping upload');
        resolve(null);
        return;
      }

      const uploadStream = targetFolder.upload({
        name: fileName,
        size: buffer.length,
        allowUploadBuffering: true
      });

      uploadStream.on('complete', (file) => {
        if (!file) {
          console.warn('⚠️  Upload completed but file node not found');
          resolve(null);
          return;
        }

        console.log(`✅ Successfully uploaded ${fileName} to MEGA`);
        resolve(file.nodeId || file.h);
      });

      uploadStream.on('error', (err) => {
        console.warn('⚠️  Upload stream error:', err.message);
        resolve(null); // Don't reject, just skip upload
      });

      // Write buffer to upload stream
      uploadStream.write(buffer);
      uploadStream.end();

    } catch (error) {
      console.warn('⚠️  Error in performUpload:', error.message);
      resolve(null);
    }
  }

  /**
   * Download a file from MEGA as JSON
   * @param {string} nodeId - The MEGA node ID
   * @returns {Promise<Object>} - Returns parsed JSON object
   */
  async downloadAsJSON(nodeId) {
    return new Promise((resolve, reject) => {
      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        const file = storage.files[nodeId];
        if (!file) {
          return reject(new Error(`File with node ID ${nodeId} not found`));
        }

        const chunks = [];
        const downloadStream = file.download();

        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const jsonString = buffer.toString('utf8');
            const jsonData = JSON.parse(jsonString);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });

        downloadStream.on('error', (err) => {
          reject(err);
        });
      });

      storage.once('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * List files in a specific folder
   * @param {string} folderPath - The folder path (e.g., 'user_123/llm_conversations')
   * @returns {Promise<Array>} - Returns array of file objects
   */
  async listFiles(folderPath = '') {
    return new Promise((resolve, reject) => {
      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          let targetFolder = storage.root;

          // Navigate to the specified folder
          if (folderPath) {
            const folders = folderPath.split('/').filter(f => f.trim());
            for (const folderName of folders) {
              const existingFolder = targetFolder.children.find(
                child => child.name === folderName && child.directory
              );

              if (!existingFolder) {
                return resolve([]); // Folder doesn't exist, return empty array
              }
              targetFolder = existingFolder;
            }
          }

          // Get all files (not directories) in the target folder
          const files = targetFolder.children
            .filter(child => !child.directory)
            .map(file => ({
              nodeId: file.nodeId || file.h,
              name: file.name,
              size: file.size,
              timestamp: file.timestamp,
              createdAt: new Date(file.timestamp * 1000).toISOString()
            }));

          resolve(files);
        } catch (error) {
          reject(error);
        }
      });

      storage.once('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Delete a file from MEGA by its node handle. This is a permanent deletion.
   * @param {string} nodeId - The MEGA node handle.
   * @returns {Promise<boolean>}
   */
  async deleteFile(nodeId) {
    return new Promise((resolve, reject) => {
      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        // Find the file node using its ID from the main file map.
        const file = storage.files[nodeId];

        if (!file) {
          // If the file doesn't exist, we can consider the deletion successful
          // as the desired state (file is gone) is met.
          console.warn(`Attempted to delete file with node ID ${nodeId}, but it was not found on MEGA. Treating as success.`);
          return resolve(true);
        }

        // Permanently delete the file (skips the Rubbish Bin).
        file.delete({ permanent: true }, (err) => {
          if (err) {
            console.error(`Failed to delete file ${nodeId} from MEGA:`, err);
            return reject(err);
          }
          console.log(`✅ Successfully deleted file ${nodeId} from MEGA.`);
          resolve(true);
        });
      });

      storage.once('error', (err) => {
        console.error('MEGA storage connection error during deletion:', err);
        reject(err);
      });
    });
  }

  downloadFileAsStream(nodeId) {
    return new Promise((resolve, reject) => {
      const storage = mega({ email: this.email, password: this.password });
      storage.once('ready', () => {
        const file = storage.files[nodeId];
        if (!file) {
          // Fallback for files not immediately indexed
          const nodeInRoot = storage.root.children.find(child => child.nodeId === nodeId || child.h === nodeId);
          if (!nodeInRoot) {
            return reject(new Error(`File with node ID ${nodeId} not found in MEGA account.`));
          }
          const stream = nodeInRoot.download();
          return resolve(stream);
        }
        const stream = file.download();
        resolve(stream);
      });
      storage.once('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = new MegaService();
