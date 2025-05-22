// Storage Service for handling all localStorage operations
const StorageService = {
    // High Scores
    saveHighScores(scores) {
        localStorage.setItem('marrowGrowHighScores', JSON.stringify(scores));
    },

    loadHighScores() {
        const savedScores = localStorage.getItem('marrowGrowHighScores');
        return savedScores ? JSON.parse(savedScores) : {
            potency: [],
            yield: [],
            potencyHistory: {},
            totalYield: {},
            seedBank: {},
            seedLives: {}
        };
    },

    // Seed Lockout
    setSeedLockoutTimestamp(growerName) {
        localStorage.setItem(GAME_CONFIG.SEED_LOCKOUT_KEY + '_' + growerName, Date.now().toString());
    },

    getSeedLockoutTimestamp(growerName) {
        return parseInt(localStorage.getItem(GAME_CONFIG.SEED_LOCKOUT_KEY + '_' + growerName) || '0', 10);
    },

    clearSeedLockoutTimestamp(growerName) {
        localStorage.removeItem(GAME_CONFIG.SEED_LOCKOUT_KEY + '_' + growerName);
    },

    // Game State
    saveGameState(state) {
        localStorage.setItem('marrowGrowGameState', JSON.stringify(state));
    },

    loadGameState() {
        const savedState = localStorage.getItem('marrowGrowGameState');
        return savedState ? JSON.parse(savedState) : null;
    },

    clearGameState() {
        localStorage.removeItem('marrowGrowGameState');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
} 