// Cloudinary upload utility
const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dc7t2fvt9/upload'
const CLOUDINARY_UPLOAD_PRESET = 'chat_uploads'

export const uploadToCloudinary = async (file, resourceType = 'image') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  
  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Upload failed')
    }
    
    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error
  }
}
