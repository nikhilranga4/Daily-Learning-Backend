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
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
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

  /**
   * Upload buffer to conversation-specific folder structure: users/userid/userdata_files/conversationid/
   */
  async uploadToConversationFolder(buffer, fileName, userId, conversationId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, skipping upload');
        resolve({
          success: false,
          error: 'Mega Drive not configured',
          fallback: true
        });
        return;
      }

      // Add timeout for the entire operation
      const timeoutId = setTimeout(() => {
        console.warn('⚠️  Mega Drive connection timeout, operation cancelled');
        resolve({
          success: false,
          error: 'Connection timeout',
          fallback: true,
          fileName: fileName,
          userId: userId,
          conversationId: conversationId
        });
      }, 30000); // 30 seconds timeout

      console.log(`🔄 Attempting to connect to Mega Drive for conversation upload...`);
      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        clearTimeout(timeoutId);
        try {
          let currentFolder = storage.root;

          if (!currentFolder) {
            console.warn('⚠️  Mega Drive root not available, skipping upload');
            resolve(null);
            return;
          }

          // Create folder structure: users/userid/userdata_files/conversationid
          const folderPath = `users/${userId}/userdata_files/${conversationId}`;
          const folders = folderPath.split('/').filter(f => f.trim());

          console.log(`📁 Creating conversation folder structure: ${folderPath}`);

          // Create folder structure recursively with longer wait time
          this.createFolderStructure(currentFolder, folders, 0, (finalFolder) => {
            if (finalFolder) {
              // Wait a bit more for the folder to be fully ready
              setTimeout(() => {
                this.performUserUpload(finalFolder, fileName, buffer, userId, conversationId, resolve);
              }, 2000); // Wait 2 seconds for folder to be ready
            } else {
              console.warn('⚠️  Could not create folder structure, using fallback');
              this.fallbackUpload(currentFolder, fileName, buffer, userId, conversationId, resolve);
            }
          });

        } catch (error) {
          console.warn('⚠️  Error in user folder upload:', error.message);
          resolve(null);
        }
      });

      storage.once('error', (err) => {
        clearTimeout(timeoutId);
        console.warn('⚠️  Mega Drive connection error:', err.message);
        resolve({
          success: false,
          error: err.message,
          fallback: true,
          fileName: fileName,
          userId: userId,
          conversationId: conversationId
        });
      });
    });
  }

  /**
   * Helper method to create folder structure recursively
   */
  createFolderStructure(currentFolder, folders, index, callback) {
    if (index >= folders.length) {
      callback(currentFolder);
      return;
    }

    const folderName = folders[index];

    // Wait a bit for folder to be ready
    setTimeout(() => {
      // Ensure children are loaded
      if (!currentFolder.children) {
        console.warn(`⚠️  Folder children not loaded for ${folderName}, waiting...`);
        // Wait for children to load
        setTimeout(() => {
          if (!currentFolder.children) {
            console.warn(`⚠️  Could not load children for ${folderName}, using current folder`);
            // Continue with current folder
            this.createFolderStructure(currentFolder, folders, index + 1, callback);
            return;
          }
          this.processFolderCreation(currentFolder, folders, index, callback);
        }, 1000);
        return;
      }

      this.processFolderCreation(currentFolder, folders, index, callback);
    }, 500);
  }

  /**
   * Process folder creation for a specific folder
   */
  processFolderCreation(currentFolder, folders, index, callback) {
    const folderName = folders[index];

    let existingFolder = currentFolder.children.find(
      child => child.name === folderName && child.directory
    );

    if (!existingFolder) {
      // Create the folder if it doesn't exist
      if (typeof currentFolder.mkdir === 'function') {
        try {
          existingFolder = currentFolder.mkdir(folderName);
          console.log(`✅ Created folder: ${folderName}`);

          // Wait for the new folder to be ready
          setTimeout(() => {
            this.createFolderStructure(existingFolder, folders, index + 1, callback);
          }, 1000);

        } catch (mkdirError) {
          console.warn(`⚠️  Failed to create folder ${folderName}:`, mkdirError.message);
          // Continue with current folder if creation fails
          this.createFolderStructure(currentFolder, folders, index + 1, callback);
        }
      } else {
        console.warn(`⚠️  Cannot create folder ${folderName}, mkdir not available`);
        // Continue with current folder
        this.createFolderStructure(currentFolder, folders, index + 1, callback);
      }
    } else {
      console.log(`📁 Found existing folder: ${folderName}`);
      this.createFolderStructure(existingFolder, folders, index + 1, callback);
    }
  }

  /**
   * Perform the actual upload to user folder
   */
  performUserUpload(targetFolder, fileName, buffer, userId, conversationId, resolve) {
    try {
      // Wait a bit for the folder to be ready
      setTimeout(() => {
        if (!targetFolder || typeof targetFolder.upload !== 'function') {
          console.warn('⚠️  Target folder upload not available, trying alternative method');
          // Try to use the folder's parent or root as fallback
          this.fallbackUpload(targetFolder, fileName, buffer, userId, conversationId, resolve);
          return;
        }

        this.executeUpload(targetFolder, fileName, buffer, userId, conversationId, resolve);
      }, 1500); // Wait 1.5 seconds for folder to be ready

    } catch (error) {
      console.warn('⚠️  Error in performUserUpload:', error.message);
      resolve(null);
    }
  }

  /**
   * Execute the actual upload
   */
  executeUpload(targetFolder, fileName, buffer, userId, conversationId, resolve) {
    try {
      console.log(`📤 Attempting upload to user folder: ${fileName}`);

      const uploadStream = targetFolder.upload({
        name: fileName,
        size: buffer.length,
        allowUploadBuffering: true
      });

      uploadStream.on('complete', (file) => {
        if (!file) {
          console.warn('⚠️  Upload completed but no file returned');
          resolve(null);
          return;
        }

        // Generate public link
        file.link((err, url) => {
          if (err) {
            console.warn('⚠️  Failed to generate public link:', err.message);
            resolve({
              success: true,
              fileName: fileName,
              nodeId: file.nodeId || file.h,
              publicUrl: null,
              userId: userId,
              conversationId: conversationId,
              folderPath: `users/${userId}/userdata_files/${conversationId}`
            });
            return;
          }

          console.log(`✅ Successfully uploaded ${fileName} to user folder ${userId}`);
          resolve({
            success: true,
            fileName: fileName,
            nodeId: file.nodeId || file.h,
            publicUrl: url,
            userId: userId,
            conversationId: conversationId,
            folderPath: `users/${userId}/userdata_files/${conversationId}`
          });
        });
      });

      uploadStream.on('error', (err) => {
        console.warn('⚠️  Upload stream error:', err.message);
        resolve(null);
      });

      // Write buffer to upload stream
      uploadStream.write(buffer);
      uploadStream.end();

    } catch (error) {
      console.warn('⚠️  Error in executeUpload:', error.message);
      resolve(null);
    }
  }

  /**
   * Fallback upload method - try to upload to user folder using alternative approach
   */
  fallbackUpload(targetFolder, fileName, buffer, userId, conversationId, resolve) {
    console.log(`🔄 Trying fallback upload for user ${userId}`);

    // Try to navigate to the conversation folder and upload there
    this.navigateToConversationFolderAndUpload(userId, conversationId, fileName, buffer, resolve);
  }

  /**
   * Navigate to conversation folder and upload file there
   */
  navigateToConversationFolderAndUpload(userId, conversationId, fileName, buffer, resolve) {
    const storage = mega({ email: this.email, password: this.password });

    storage.once('ready', () => {
      try {
        let currentFolder = storage.root;
        const folderPath = `users/${userId}/userdata_files/${conversationId}`;

        console.log(`🔍 Navigating to conversation folder: ${folderPath}`);

        // Try to find the existing conversation folder structure
        this.findConversationFolder(currentFolder, userId, conversationId, (conversationFolder) => {
          if (conversationFolder) {
            console.log(`📁 Found conversation folder for ${conversationId}, attempting upload`);
            this.directUploadToFolder(conversationFolder, fileName, buffer, userId, resolve);
          } else {
            console.warn(`⚠️  Could not find conversation folder for ${conversationId}, using root upload`);
            // As last resort, use simple upload but mark it clearly
            this.simpleUploadBuffer(buffer, fileName)
              .then(result => {
                if (result && result.success) {
                  console.log(`✅ Root fallback upload successful for user ${userId}`);
                  resolve({
                    success: true,
                    fileName: fileName,
                    nodeId: result.nodeId,
                    publicUrl: result.publicUrl,
                    userId: userId,
                    folderPath: 'root (emergency fallback)',
                    fallback: true,
                    warning: 'File uploaded to root due to folder access issues'
                  });
                } else {
                  resolve(null);
                }
              })
              .catch(() => resolve(null));
          }
        });
      } catch (error) {
        console.warn(`⚠️  Error in fallback navigation for user ${userId}:`, error.message);
        resolve(null);
      }
    });

    storage.once('error', (err) => {
      console.warn(`⚠️  Mega Drive connection error in fallback:`, err.message);
      resolve(null);
    });
  }

  /**
   * Find user folder in the directory structure
   */
  findUserFolder(rootFolder, userId, callback) {
    try {
      if (!rootFolder.children) {
        console.warn(`⚠️  Root folder has no children`);
        callback(null);
        return;
      }

      // Look for 'users' folder
      const usersFolder = rootFolder.children.find(
        child => child.name === 'users' && child.directory
      );

      if (!usersFolder || !usersFolder.children) {
        console.warn(`⚠️  Users folder not found or has no children`);
        callback(null);
        return;
      }

      // Look for user ID folder
      const userIdFolder = usersFolder.children.find(
        child => child.name === userId && child.directory
      );

      if (!userIdFolder || !userIdFolder.children) {
        console.warn(`⚠️  User ID folder not found or has no children`);
        callback(null);
        return;
      }

      // Look for userdata_files folder
      const userDataFolder = userIdFolder.children.find(
        child => child.name === 'userdata_files' && child.directory
      );

      if (!userDataFolder) {
        console.warn(`⚠️  userdata_files folder not found`);
        callback(null);
        return;
      }

      console.log(`✅ Successfully found user folder structure for ${userId}`);
      callback(userDataFolder);

    } catch (error) {
      console.warn(`⚠️  Error finding user folder:`, error.message);
      callback(null);
    }
  }

  /**
   * Find conversation folder in the directory structure
   */
  findConversationFolder(rootFolder, userId, conversationId, callback) {
    try {
      if (!rootFolder.children) {
        console.warn(`⚠️  Root folder has no children`);
        callback(null);
        return;
      }

      // Look for 'users' folder
      const usersFolder = rootFolder.children.find(
        child => child.name === 'users' && child.directory
      );

      if (!usersFolder || !usersFolder.children) {
        console.warn(`⚠️  Users folder not found or has no children`);
        callback(null);
        return;
      }

      // Look for user ID folder
      const userIdFolder = usersFolder.children.find(
        child => child.name === userId && child.directory
      );

      if (!userIdFolder || !userIdFolder.children) {
        console.warn(`⚠️  User ID folder not found or has no children`);
        callback(null);
        return;
      }

      // Look for userdata_files folder
      const userDataFolder = userIdFolder.children.find(
        child => child.name === 'userdata_files' && child.directory
      );

      if (!userDataFolder || !userDataFolder.children) {
        console.warn(`⚠️  userdata_files folder not found or has no children`);
        callback(null);
        return;
      }

      // Look for conversation ID folder
      const conversationFolder = userDataFolder.children.find(
        child => child.name === conversationId && child.directory
      );

      if (!conversationFolder) {
        console.warn(`⚠️  Conversation folder not found: ${conversationId}`);
        callback(null);
        return;
      }

      console.log(`✅ Successfully found conversation folder structure for ${conversationId}`);
      callback(conversationFolder);

    } catch (error) {
      console.warn(`⚠️  Error finding conversation folder:`, error.message);
      callback(null);
    }
  }

  /**
   * Direct upload to a specific folder
   */
  directUploadToFolder(folder, fileName, buffer, userId, resolve) {
    try {
      if (!folder || typeof folder.upload !== 'function') {
        console.warn(`⚠️  Folder upload not available for direct upload`);
        resolve(null);
        return;
      }

      console.log(`📤 Direct upload to user folder: ${fileName}`);

      const uploadStream = folder.upload({
        name: fileName,
        size: buffer.length,
        allowUploadBuffering: true
      });

      uploadStream.on('complete', (file) => {
        if (!file) {
          console.warn('⚠️  Direct upload completed but no file returned');
          resolve(null);
          return;
        }

        // Generate public link
        file.link((err, url) => {
          if (err) {
            console.warn('⚠️  Failed to generate public link for direct upload:', err.message);
            resolve({
              success: true,
              fileName: fileName,
              nodeId: file.nodeId || file.h,
              publicUrl: null,
              userId: userId,
              folderPath: `users/${userId}/userdata_files`
            });
            return;
          }

          console.log(`✅ Successfully uploaded ${fileName} to user folder ${userId} via direct upload`);
          resolve({
            success: true,
            fileName: fileName,
            nodeId: file.nodeId || file.h,
            publicUrl: url,
            userId: userId,
            folderPath: `users/${userId}/userdata_files`
          });
        });
      });

      uploadStream.on('error', (err) => {
        console.warn('⚠️  Direct upload stream error:', err.message);
        resolve(null);
      });

      // Write buffer to upload stream
      uploadStream.write(buffer);
      uploadStream.end();

    } catch (error) {
      console.warn('⚠️  Error in direct upload to folder:', error.message);
      resolve(null);
    }
  }

  /**
   * List files in conversation-specific folder: users/userid/userdata_files/conversationid/
   */
  async listConversationFiles(userId, conversationId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, cannot list conversation files');
        resolve([]);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          let currentFolder = storage.root;
          const folderPath = `users/${userId}/userdata_files/${conversationId}`;
          const folders = folderPath.split('/').filter(f => f.trim());

          console.log(`📁 Looking for conversation files in: ${folderPath}`);

          // Navigate to conversation folder
          for (const folderName of folders) {
            if (!currentFolder.children) {
              console.warn(`⚠️  No children found for folder: ${folderName}`);
              resolve([]);
              return;
            }

            const existingFolder = currentFolder.children.find(
              child => child.name === folderName && child.directory
            );

            if (!existingFolder) {
              console.log(`📁 Conversation folder not found: ${folderName}, conversation has no files yet`);
              resolve([]);
              return;
            }

            currentFolder = existingFolder;
          }

          // List files in the conversation folder
          if (!currentFolder.children) {
            console.log(`📁 Conversation folder exists but no files found for: ${conversationId}`);
            resolve([]);
            return;
          }

          const files = currentFolder.children
            .filter(child => !child.directory && child.name.endsWith('.json'))
            .map(file => ({
              name: file.name,
              nodeId: file.nodeId || file.h,
              size: file.size,
              timestamp: file.timestamp,
              userId: userId,
              conversationId: conversationId
            }));

          console.log(`📄 Found ${files.length} files for conversation: ${conversationId}`);
          resolve(files);

        } catch (error) {
          console.warn('⚠️  Error listing conversation files:', error.message);
          resolve([]);
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  Mega Drive connection error:', err.message);
        resolve([]);
      });
    });
  }

  /**
   * List conversation folders in user-specific folder: users/userid/userdata_files/
   */
  async listUserConversations(userId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, cannot list files');
        resolve([]);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          let currentFolder = storage.root;
          const folderPath = `users/${userId}/userdata_files`;
          const folders = folderPath.split('/').filter(f => f.trim());

          console.log(`📁 Looking for user conversations in: ${folderPath}`);

          // Navigate to user folder
          for (const folderName of folders) {
            if (!currentFolder.children) {
              console.warn(`⚠️  No children found for folder: ${folderName}`);
              resolve([]);
              return;
            }

            const existingFolder = currentFolder.children.find(
              child => child.name === folderName && child.directory
            );

            if (!existingFolder) {
              console.log(`📁 User folder not found: ${folderName}, user has no conversations yet`);
              resolve([]);
              return;
            }

            currentFolder = existingFolder;
          }

          // List conversation folders in the user's userdata_files folder
          if (!currentFolder.children) {
            console.log(`📁 User folder exists but no conversations found for user: ${userId}`);
            resolve([]);
            return;
          }

          // Get conversation folders (directories that contain conversation_data.json)
          const conversationFolders = currentFolder.children
            .filter(child => child.directory)
            .map(folder => ({
              conversationId: folder.name,
              folderName: folder.name,
              nodeId: folder.nodeId || folder.h,
              timestamp: folder.timestamp,
              userId: userId,
              folderPath: `${folderPath}/${folder.name}`
            }));

          console.log(`� Found ${conversationFolders.length} conversation folders for user: ${userId}`);
          resolve(conversationFolders);

        } catch (error) {
          console.warn('⚠️  Error listing user files:', error.message);
          resolve([]);
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  Mega Drive connection error:', err.message);
        resolve([]);
      });
    });
  }

  /**
   * Update an existing file in conversation folder
   */
  async updateConversationFile(buffer, fileName, userId, conversationId, existingFileId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, cannot update file');
        resolve(null);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          console.log(`🔍 Looking for existing conversation file with ID: ${existingFileId}`);

          // Try to find the existing file by ID in the storage
          let existingFile = null;

          // Search through all files to find the one with matching ID
          for (const fileId in storage.files) {
            if (fileId === existingFileId || storage.files[fileId].nodeId === existingFileId) {
              existingFile = storage.files[fileId];
              break;
            }
          }

          if (!existingFile) {
            console.warn(`⚠️  Existing conversation file not found with ID: ${existingFileId}`);
            // Try alternative approach - find by name in conversation folder
            this.findAndUpdateConversationByName(buffer, fileName, userId, conversationId, resolve);
            return;
          }

          console.log(`📄 Found existing conversation file: ${existingFile.name}`);

          // Delete the old file first
          existingFile.delete((deleteErr) => {
            if (deleteErr) {
              console.warn(`⚠️  Failed to delete old conversation file: ${deleteErr.message}`);
              resolve(null);
              return;
            }

            console.log(`🗑️  Deleted old conversation file: ${existingFile.name}`);

            // Upload the new version to the same conversation folder
            this.uploadToConversationFolder(buffer, fileName, userId, conversationId)
              .then(uploadResult => {
                if (uploadResult && uploadResult.success) {
                  console.log(`✅ Successfully updated conversation file: ${fileName}`);
                  resolve(uploadResult);
                } else {
                  console.warn(`⚠️  Failed to upload updated conversation file`);
                  resolve(null);
                }
              })
              .catch(uploadError => {
                console.warn(`⚠️  Error uploading updated conversation file: ${uploadError.message}`);
                resolve(null);
              });
          });

        } catch (error) {
          console.warn('⚠️  Error in updateConversationFile:', error.message);
          resolve(null);
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  Mega Drive connection error in updateConversationFile:', err.message);
        resolve(null);
      });
    });
  }

  /**
   * Find and update conversation file by name in conversation folder
   */
  findAndUpdateConversationByName(buffer, fileName, userId, conversationId, resolve) {
    console.log(`🔍 Looking for existing conversation file by name: ${fileName}`);

    // Find the conversation folder and look for existing file
    this.listConversationFiles(userId, conversationId)
      .then(conversationFiles => {
        const existingFile = conversationFiles.find(file => file.name === fileName);

        if (existingFile) {
          console.log(`📄 Found existing conversation file by name: ${fileName}`);
          // Try to update using the found file's nodeId
          this.updateConversationFile(buffer, fileName, userId, conversationId, existingFile.nodeId)
            .then(result => resolve(result))
            .catch(() => {
              // If update fails, create new file
              console.warn(`⚠️  Update by name failed, creating new conversation file`);
              this.uploadToConversationFolder(buffer, fileName, userId, conversationId)
                .then(result => resolve(result))
                .catch(() => resolve(null));
            });
        } else {
          console.log(`📄 No existing conversation file found, creating new one: ${fileName}`);
          // No existing file, create new one
          this.uploadToConversationFolder(buffer, fileName, userId, conversationId)
            .then(result => resolve(result))
            .catch(() => resolve(null));
        }
      })
      .catch(() => {
        console.warn(`⚠️  Failed to list conversation files, creating new file`);
        this.uploadToConversationFolder(buffer, fileName, userId, conversationId)
          .then(result => resolve(result))
          .catch(() => resolve(null));
      });
  }

  /**
   * Update an existing file in user folder (legacy method)
   */
  async updateUserFile(buffer, fileName, userId, existingFileId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, cannot update file');
        resolve(null);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          console.log(`🔍 Looking for existing file with ID: ${existingFileId}`);

          // Try to find the existing file by ID in the storage
          let existingFile = null;

          // Search through all files to find the one with matching ID
          for (const fileId in storage.files) {
            if (fileId === existingFileId || storage.files[fileId].nodeId === existingFileId) {
              existingFile = storage.files[fileId];
              break;
            }
          }

          if (!existingFile) {
            console.warn(`⚠️  Existing file not found with ID: ${existingFileId}`);
            // Try alternative approach - find by name in user folder
            this.findAndUpdateByName(buffer, fileName, userId, resolve);
            return;
          }

          console.log(`📄 Found existing file: ${existingFile.name}`);

          // Delete the old file first
          existingFile.delete((deleteErr) => {
            if (deleteErr) {
              console.warn(`⚠️  Failed to delete old file: ${deleteErr.message}`);
              resolve(null);
              return;
            }

            console.log(`🗑️  Deleted old file: ${existingFile.name}`);

            // Upload the new version to the same user folder
            this.uploadToUserFolder(buffer, fileName, userId)
              .then(uploadResult => {
                if (uploadResult && uploadResult.success) {
                  console.log(`✅ Successfully updated file: ${fileName}`);
                  resolve(uploadResult);
                } else {
                  console.warn(`⚠️  Failed to upload updated file`);
                  resolve(null);
                }
              })
              .catch(uploadError => {
                console.warn(`⚠️  Error uploading updated file: ${uploadError.message}`);
                resolve(null);
              });
          });

        } catch (error) {
          console.warn('⚠️  Error in updateUserFile:', error.message);
          resolve(null);
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  Mega Drive connection error in updateUserFile:', err.message);
        resolve(null);
      });
    });
  }

  /**
   * Find and update file by name in user folder
   */
  findAndUpdateByName(buffer, fileName, userId, resolve) {
    console.log(`🔍 Looking for existing file by name: ${fileName}`);

    // Find the conversation folder and look for existing file
    this.listConversationFiles(userId, conversationId)
      .then(userFiles => {
        const existingFile = userFiles.find(file => file.name === fileName);

        if (existingFile) {
          console.log(`📄 Found existing file by name: ${fileName}`);
          // Try to update using the found file's nodeId
          this.updateUserFile(buffer, fileName, userId, existingFile.nodeId)
            .then(result => resolve(result))
            .catch(() => {
              // If update fails, create new file
              console.warn(`⚠️  Update by name failed, creating new file`);
              this.uploadToUserFolder(buffer, fileName, userId)
                .then(result => resolve(result))
                .catch(() => resolve(null));
            });
        } else {
          console.log(`📄 No existing file found, creating new one: ${fileName}`);
          // No existing file, create new one
          this.uploadToUserFolder(buffer, fileName, userId)
            .then(result => resolve(result))
            .catch(() => resolve(null));
        }
      })
      .catch(() => {
        console.warn(`⚠️  Failed to list user files, creating new file`);
        this.uploadToUserFolder(buffer, fileName, userId)
          .then(result => resolve(result))
          .catch(() => resolve(null));
      });
  }

  /**
   * Simple upload method that bypasses folder creation issues
   */
  async simpleUploadBuffer(buffer, fileName) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, skipping upload');
        resolve(null);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          const targetFolder = storage.root;

          if (!targetFolder || typeof targetFolder.upload !== 'function') {
            console.warn('⚠️  Mega Drive upload not available, skipping upload');
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
              console.warn('⚠️  Upload completed but no file returned');
              resolve(null);
              return;
            }

            // Generate public link
            file.link((err, url) => {
              if (err) {
                console.warn('⚠️  Failed to generate public link:', err.message);
                resolve({
                  success: true,
                  fileName: fileName,
                  nodeId: file.nodeId || file.h,
                  publicUrl: null
                });
                return;
              }

              console.log(`✅ Successfully uploaded ${fileName} with public URL`);
              resolve({
                success: true,
                fileName: fileName,
                nodeId: file.nodeId || file.h,
                publicUrl: url
              });
            });
          });

          uploadStream.on('error', (err) => {
            console.warn('⚠️  Upload stream error:', err.message);
            resolve(null);
          });

          // Write buffer to upload stream
          uploadStream.write(buffer);
          uploadStream.end();

        } catch (error) {
          console.warn('⚠️  Error in simple upload:', error.message);
          resolve(null);
        }
      });

      storage.once('error', (err) => {
        console.warn('⚠️  Mega Drive connection error:', err.message);
        resolve(null);
      });
    });
  }

  /**
   * Generate a public link for an existing file by nodeId
   */
  async generatePublicLink(nodeId) {
    return new Promise((resolve, reject) => {
      // Check if Mega credentials are configured
      if (!this.email || !this.password || this.email === 'your_mega_email@example.com' || this.email === '') {
        console.warn('⚠️  Mega Drive not configured, cannot generate public link');
        resolve(null);
        return;
      }

      const storage = mega({ email: this.email, password: this.password });

      storage.once('ready', () => {
        try {
          // Find the file by nodeId
          const file = storage.files[nodeId];
          if (!file) {
            console.warn(`⚠️  File with nodeId ${nodeId} not found in Mega Drive`);
            return resolve(null);
          }

          // Generate public link
          file.link((err, url) => {
            if (err) {
              console.error('Failed to generate public link:', err);
              return resolve(null);
            }

            console.log(`🔗 Generated public link: ${url}`);
            resolve(url);
          });
        } catch (error) {
          console.error('Error generating public link:', error);
          resolve(null);
        }
      });

      storage.once('error', (err) => {
        console.error('Mega Drive connection error:', err);
        resolve(null);
      });
    });
  }
}

module.exports = new MegaService();
