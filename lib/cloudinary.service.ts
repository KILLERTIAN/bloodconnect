
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';

// Configuration
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'bloodconnect_unsigned';

// Initialize Cloudinary instance for transformations
export const cld = new Cloudinary({
    cloud: {
        cloudName: CLOUD_NAME,
    }
});

/**
 * Main upload function.
 * Uses unsigned uploads for simplicity and to avoid native module dependencies for signing.
 */
export async function uploadImage(uri: string): Promise<string> {
    if (!CLOUD_NAME) {
        console.warn('Cloudinary Cloud Name missing. Using local URI as fallback.');
        return uri;
    }

    try {
        const formData = new FormData();

        const photo = {
            uri: uri,
            type: 'image/jpeg',
            name: 'upload.jpg',
        } as any;

        formData.append('file', photo);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('cloud_name', CLOUD_NAME);
        formData.append('folder', 'bloodconnect');

        console.log('🔓 Initiating Unsigned Upload to Cloudinary...');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        const data = await response.json();

        if (data.secure_url) {
            console.log('✅ Image uploaded successfully (Unsigned):', data.secure_url);
            return data.secure_url;
        } else {
            console.error('❌ Cloudinary upload error:', data);
            throw new Error(data.error?.message || 'Cloudinary upload failed');
        }
    } catch (error: any) {
        console.error('❌ Upload service exception:', error);
        throw error;
    }
}

/**
 * Helper to get a transformed URL (e.g., for avatars)
 */
export function getAvatarUrl(publicIdOrUrl: string | undefined) {
    if (!publicIdOrUrl) return undefined;
    if (publicIdOrUrl.startsWith('http')) {
        if (!publicIdOrUrl.includes('cloudinary.com')) return publicIdOrUrl;
    }

    return cld.image(publicIdOrUrl)
        .resize(fill().width(200).height(200))
        .format('auto')
        .quality('auto')
        .toURL();
}

/**
 * Generic transformation helper
 */
export function getTransformedUrl(publicIdOrUrl: string | undefined, width: number = 800, height: number = 450) {
    if (!publicIdOrUrl) return undefined;

    // If it's already a full URL, return it as is.
    // Cloudinary SDK's cld.image() helper expects a public ID, not a full URL.
    if (publicIdOrUrl.startsWith('http')) return publicIdOrUrl;

    return cld.image(publicIdOrUrl)
        .resize(fill().width(width).height(height))
        .format('auto')
        .quality('auto')
        .toURL();
}
