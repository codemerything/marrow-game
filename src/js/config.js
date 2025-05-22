// Game Constants
const GAME_CONFIG = {
    // Seed System
    SEED_LIVES_START: 3,
    SEED_LOCKOUT_HOURS: 24,
    SEED_LOCKOUT_KEY: 'marrowGrowSeedLockout',

    // Growth Stages
    STAGES: {
        GERMINATING: 'Germinating',
        BONE_GROWTH: 'Bone Growth',
        PHANTOM_BLOOM: 'Phantom Bloom'
    },

    // Resource Limits
    RESOURCES: {
        MAX_WATER: 100,
        MAX_LIGHT: 100,
        MAX_NUTRIENTS: 100,
        MAX_STRESS: 100
    },

    // Strains
    STRAINS: {
        CRYPT_COOKIES: 'cryptcookies',
        SKELE_SKITTLEZ: 'skeleskittlez',
        HELLHOUND_HAZE: 'hellhoundhaze'
    },

    // Soil Types
    SOIL_TYPES: {
        OSSUARY: 'ossuary',
        GRAVEBLEND: 'graveblend',
        MARROWMOSS: 'marrowmoss'
    },

    // Event Probabilities
    EVENT_CHANCES: {
        PEST: 0.15,
        RAIDER: 0.1,
        NUTRIENT: 0.2
    },

    // Growth Timers (in milliseconds)
    TIMERS: {
        GROWTH_INTERVAL: 1000,
        HARVEST_WINDOW: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONFIG;
} 