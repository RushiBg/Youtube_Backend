import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async (filePath) => {
    try {
        if(!filePath) {
            throw new Error('File path is required');
        }
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto', // Automatically detect the resource type (image/video) 
        });
        // console.log("File uploaded to Cloudinary:", result.url);
        fs.unlinkSync(filePath,{
            resource_type: 'auto', // Automatically detect the resource type (image/video)
        }); // Delete the local file after upload
        return result;
        
    } catch (error) {
        fs.unlinkSync(filePath); // Ensure the file is deleted even if upload fails
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
} 

export {uploadOnCloudinary}