export const AVATAR_MAPPING: Record<string, string> = {
    'Amit Patel': 'https://picsum.photos/id/1012/300/300', // Male
    'Sanya Gupta': 'https://picsum.photos/id/1027/300/300', // Female
    'Vikram Singh': 'https://picsum.photos/id/64/300/300', // Male
    'Priya Reddy': 'https://picsum.photos/id/1011/300/300', // Female
    'Rohan Mehra': 'https://picsum.photos/id/177/300/300', // Male
    'Anjali Sharma': 'https://picsum.photos/id/342/300/300', // Female
};

export const getDonorAvatar = (name: string, gender: 'male' | 'female' = 'male') => {
    if (AVATAR_MAPPING[name]) return AVATAR_MAPPING[name];

    // Fallback based on gender
    return gender === 'female'
        ? 'https://picsum.photos/id/1027/300/300'
        : 'https://picsum.photos/id/1012/300/300';
};
