export const AVATAR_MAPPING: Record<string, string> = {
    'Amit Patel': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300', // Male
    'Sanya Gupta': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300', // Female
    'Vikram Singh': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300', // Male
    'Priya Reddy': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300', // Female
    'Rohan Mehra': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300', // Male
    'Anjali Sharma': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=300', // Female
};

export const getDonorAvatar = (name: string, gender: 'male' | 'female' = 'male') => {
    if (AVATAR_MAPPING[name]) return AVATAR_MAPPING[name];

    // Fallback based on gender
    return gender === 'female'
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300'
        : 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=300';
};
