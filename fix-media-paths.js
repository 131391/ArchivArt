const db = require('./src/config/database');
const fs = require('fs').promises;
const path = require('path');

async function fixMediaPaths() {
    try {
        console.log('🔍 Checking media file paths...');
        
        // Get all media records
        const [mediaRecords] = await db.execute('SELECT id, title, file_path, scanning_image FROM media');
        
        console.log(`Found ${mediaRecords.length} media records`);
        
        // Get actual files in the media directory
        const mediaDir = path.join(__dirname, 'src/public/uploads/media');
        const actualFiles = await fs.readdir(mediaDir);
        const mediaFiles = actualFiles.filter(file => !file.startsWith('.'));
        
        console.log(`Found ${mediaFiles.length} actual media files:`, mediaFiles);
        
        // Create scanning-images directory if it doesn't exist
        const scanningDir = path.join(__dirname, 'src/public/uploads/scanning-images');
        try {
            await fs.access(scanningDir);
        } catch {
            await fs.mkdir(scanningDir, { recursive: true });
            console.log('📁 Created scanning-images directory');
        }
        
        // Update database records to match actual files
        for (let i = 0; i < mediaRecords.length && i < mediaFiles.length; i++) {
            const record = mediaRecords[i];
            const actualFile = mediaFiles[i];
            
            // Update file_path to just the filename
            const newFilePath = actualFile;
            
            // Create a scanning image filename based on the media file
            const fileExt = path.extname(actualFile);
            const baseName = path.basename(actualFile, fileExt);
            const newScanningImage = `${baseName}_scan.jpg`;
            
            console.log(`📝 Updating record ${record.id}:`);
            console.log(`   Old file_path: ${record.file_path}`);
            console.log(`   New file_path: ${newFilePath}`);
            console.log(`   New scanning_image: ${newScanningImage}`);
            
            await db.execute(
                'UPDATE media SET file_path = ?, scanning_image = ? WHERE id = ?',
                [newFilePath, newScanningImage, record.id]
            );
        }
        
        console.log('✅ Media paths updated successfully!');
        
        // Show updated records
        const [updatedRecords] = await db.execute('SELECT id, title, file_path, scanning_image FROM media');
        console.log('\n📋 Updated media records:');
        updatedRecords.forEach(record => {
            console.log(`   ID ${record.id}: ${record.title} -> ${record.file_path} (scan: ${record.scanning_image})`);
        });
        
    } catch (error) {
        console.error('❌ Error fixing media paths:', error);
    } finally {
        process.exit(0);
    }
}

fixMediaPaths();
