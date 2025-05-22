// High score management
let currentGrower = '';
let highScores = StorageService.loadHighScores();

// Load high scores from localStorage
function loadHighScores() {
    highScores = StorageService.loadHighScores();
}

// Save high scores to localStorage
function saveHighScores() {
    StorageService.saveHighScores(highScores);
}

// Update high scores display
function updateHighScoresDisplay() {
    ViewService.updateHighScoresDisplay(highScores, currentGrower);
    updateSeedBankSelectionDisplay();
}

// Add a new score
function addScore(type, score) {
    if (!currentGrower) return;

    if (type === 'potency') {
        // Track all potency scores for this grower
        if (!highScores.potencyHistory[currentGrower]) {
            highScores.potencyHistory[currentGrower] = [];
        }
        highScores.potencyHistory[currentGrower].push(score);
    }
    if (type === 'yield') {
        // Track total yield for this grower
        if (!highScores.totalYield[currentGrower]) {
            highScores.totalYield[currentGrower] = 0;
        }
        highScores.totalYield[currentGrower] += score;
    }
    saveHighScores();
    updateHighScoresDisplay();
}

// --- Seed Lives System ---
function getLivesForPlayer() {
    if (!currentGrower || !highScores.seedLives) return 0;
    return highScores.seedLives[currentGrower] || 0;
}

function setLivesForPlayer(val) {
    if (!highScores.seedLives) highScores.seedLives = {};
    highScores.seedLives[currentGrower] = val;
    saveHighScores();
}

function setSeedLockoutTimestamp() {
    StorageService.setSeedLockoutTimestamp(currentGrower);
}

function getSeedLockoutTimestamp() {
    return StorageService.getSeedLockoutTimestamp(currentGrower);
}

function clearSeedLockoutTimestamp() {
    StorageService.clearSeedLockoutTimestamp(currentGrower);
}

function canStartGame() {
    // If player has any lives, can play
    if (getLivesForPlayer() > 0) return true;
    // If not, check lockout
    const lastLock = getSeedLockoutTimestamp();
    if (!lastLock) return false;
    const now = Date.now();
    if (now - lastLock >= GAME_CONFIG.SEED_LOCKOUT_HOURS * 60 * 60 * 1000) {
        // 24 hours passed, reset lives
        setLivesForPlayer(GAME_CONFIG.SEED_LIVES_START);
        clearSeedLockoutTimestamp();
        return true;
    }
    return false;
}

function getSeedLockoutTimeLeft() {
    const lastLock = getSeedLockoutTimestamp();
    if (!lastLock) return 0;
    const now = Date.now();
    const msLeft = GAME_CONFIG.SEED_LOCKOUT_HOURS * 60 * 60 * 1000 - (now - lastLock);
    return msLeft > 0 ? msLeft : 0;
}

// --- Grower Name Local Storage ---
function saveGrowerName(name) {
    localStorage.setItem('marrowGrowLastGrower', name);
}
function loadGrowerName() {
    return localStorage.getItem('marrowGrowLastGrower') || '';
}

// On name confirm, ensure player has lives or set up lockout
function initializeNameInput() {
    const nameInput = document.getElementById('growerNameInput');
    const confirmBtn = document.getElementById('confirmNameBtn');
    const nameInputScreen = document.getElementById('nameInputScreen');
    const selectionScreen = document.getElementById('selectionScreen');
    const namePrompt = document.getElementById('growerNamePrompt');
    // Auto-fill last grower name if present
    const lastName = loadGrowerName();
    nameInput.value = lastName;
    if (lastName) {
        namePrompt.textContent = `Welcome ${lastName}!`;
        confirmBtn.textContent = 'Continue Growing';
        nameInput.style.visibility = 'hidden';
        nameInput.style.pointerEvents = 'none';
    } else {
        namePrompt.textContent = 'Enter your Grower name';
        confirmBtn.textContent = 'Begin Growing';
        nameInput.style.visibility = 'visible';
        nameInput.style.pointerEvents = 'auto';
    }
    confirmBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (name) {
            currentGrower = name;
            saveGrowerName(name);
            document.getElementById('growerName').textContent = `Grower: ${name}`;
            // Always give lives if new player or after lockout
            if (!highScores.seedLives) highScores.seedLives = {};
            if (typeof highScores.seedLives[currentGrower] !== 'number' || highScores.seedLives[currentGrower] < 1) {
                setLivesForPlayer(GAME_CONFIG.SEED_LIVES_START);
                updateHighScoresDisplay();
                updateSeedBankSelectionDisplay();
            }
            nameInputScreen.classList.add('hidden');
            selectionScreen.classList.remove('hidden');
            checkSeedLockoutUI();
            updateHighScoresDisplay();
            updateSeedBankSelectionDisplay();
        }
    });
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });
}

// Prevent starting a new game if out of lives
function checkSeedLockoutUI() {
    const startButton = document.getElementById('startGameBtn');
    const lockoutMsgId = 'seedLockoutMsg';
    let lockoutMsg = document.getElementById(lockoutMsgId);
    if (!canStartGame()) {
        // Show lockout message
        if (!lockoutMsg) {
            lockoutMsg = document.createElement('div');
            lockoutMsg.id = lockoutMsgId;
            lockoutMsg.style.color = '#ffd700';
            lockoutMsg.style.fontFamily = '"Press Start 2P", monospace';
            lockoutMsg.style.fontSize = '1em';
            lockoutMsg.style.margin = '18px 0 0 0';
            lockoutMsg.style.textAlign = 'center';
            document.getElementById('selectionScreen').appendChild(lockoutMsg);
        }
        const msLeft = getSeedLockoutTimeLeft();
        const hours = Math.floor(msLeft / 3600000);
        const minutes = Math.floor((msLeft % 3600000) / 60000);
        const seconds = Math.floor((msLeft % 60000) / 1000);
        lockoutMsg.textContent = `Out of seeds! Come back in ${hours}h ${minutes}m ${seconds}s for more.`;
        startButton.disabled = true;
        // Update countdown every second
        if (!lockoutMsg._interval) {
            lockoutMsg._interval = setInterval(() => {
                if (canStartGame()) {
                    clearInterval(lockoutMsg._interval);
                    lockoutMsg.remove();
                    updateStartButton();
                } else {
                    const msLeft = getSeedLockoutTimeLeft();
                    const hours = Math.floor(msLeft / 3600000);
                    const minutes = Math.floor((msLeft % 3600000) / 60000);
                    const seconds = Math.floor((msLeft % 60000) / 1000);
                    lockoutMsg.textContent = `Out of seeds! Come back in ${hours}h ${minutes}m ${seconds}s for more.`;
                }
            }, 1000);
        }
    } else {
        // Remove lockout message if present
        if (lockoutMsg) {
            if (lockoutMsg._interval) clearInterval(lockoutMsg._interval);
            lockoutMsg.remove();
        }
        updateStartButton();
    }
}

// When starting a game, consume a life
var startButton = document.getElementById('startGameBtn');
startButton.addEventListener('click', function() {
    if (plant.seedType && plant.soilType) {
        // Check and consume a life
        if (getLivesForPlayer() > 0) {
            setLivesForPlayer(getLivesForPlayer() - 1);
            saveHighScores();
            updateHighScoresDisplay(); // Ensure UI updates immediately
            checkSeedLockoutUI();
            startGame();
            updateHighScoresDisplay(); // Update again after game starts
            // If after this, player has 0 lives, set lockout timestamp
            if (getLivesForPlayer() === 0) {
                setSeedLockoutTimestamp();
            }
        } else {
            checkSeedLockoutUI();
        }
    }
});

// Game state
var plant = {
    seedType: null,
    soilType: null,
    health: 100,
    water: 100,
    light: 100,
    nutrients: 100,
    stress: 0,
    growthStage: 0,
    growthTimer: null,
    stageTime: 0,
    totalGrowthTime: 0,
    harvestTimer: null,
    harvestTimeLeft: 24 * 60 * 60, // 24 hours in seconds
    potency: 100,
    weight: 1000,
    healthSum: 0,
    healthTicks: 0,
    optimalLight: 100,
    pestPenalty: 1,    // Now only affects potency
    raiderPenalty: 1,  // New penalty for yield
    lightEfficiencySum: 0,
    lightEfficiencyTicks: 0,
    potencyBoost: 1,
    // New automated feeding system properties
    feedingSchedule: {
        sprout: { waterTimes: 0, nutrientMix: null },
        vegetative: { waterTimes: 0, nutrientMix: null },
        flowering: { waterTimes: 0, nutrientMix: null }
    },
    lastWaterTime: 0,
    lastFeedTime: 0,
    overWatered: false,
    overFed: false,
    overWateredTime: 0,
    overFedTime: 0,
    scoresRecorded: false,
    // Add defense selection logic
    defenseType: null
};

// Growth stage definitions (20% faster)
var growthStages = [
    { name: 'Sprout', time: Math.round(40 * 0.8), image: 'sprout.png' },
    { name: 'Vegetative', time: Math.round(60 * 0.8), image: 'veg.png' },
    { name: 'Flowering', time: Math.round(80 * 0.8), image: 'flower.png' },
    { name: 'Harvest', time: 0, image: 'harvest.png' }
];

// Pest event state
var pestActive = false;
var pestTimeout = null;

// Raider event state
var raiderActive = false;
var raiderTimeout = null;

// Add nutrient boost popup logic
var nutrientActive = false;
var nutrientTimeout = null;

// Seed properties: 6 seeds, each with unique stats
const seedProperties = {
    cryptcookies: { name: 'Crypt Cookies', waterDrain: 0.6, nutrientDrain: 0.5, image: 'seed1.png', desc: 'Balanced, classic strain.' },
    skeleskittlez: { name: 'Skele Skittlez', waterDrain: 0.5, nutrientDrain: 0.7, image: 'seed2.png', desc: 'Potent, nutrient-hungry.' },
    hellhoundhaze: { name: 'Hellhound Haze', waterDrain: 0.4, nutrientDrain: 0.4, image: 'seed3.png', desc: 'Resilient, easy to grow.' },
    rotjaw: { name: 'Rotjaw', waterDrain: 0.9, nutrientDrain: 0.9, image: 'seed4.png', desc: 'Horrible: drains fast!' },
    marrowmint: { name: 'Marrow Mint', waterDrain: 0.3, nutrientDrain: 0.3, image: 'seed5.png', desc: 'Best grower: slow drain.' },
    boneblossom: { name: 'Bone Blossom', waterDrain: 0.7, nutrientDrain: 0.6, image: 'seed6.png', desc: 'Unpredictable, mid stats.' }
};

// Soil type definitions
const soilTypes = {
    ossuary: { waterDrain: 0.5, nutrientDrain: 0.6 }, // reduced drain rates
    graveblend: { waterDrain: 0.6, nutrientDrain: 0.4 }, // reduced drain rates
    marrowmoss: { waterDrain: 0.5, nutrientDrain: 0.5 } // reduced drain rates
};

// 10 unique nutrient mixes
const nutrientMixes = {
    basic: { name: "Basic Mix", desc: "Standard, reliable feed.", potency: 1.0, yield: 1.0, nutrientFeed: 10 },
    growth: { name: "Growth Boost", desc: "Bigger yields, less potency.", potency: 0.9, yield: 1.2, nutrientFeed: 25 },
    potent: { name: "Potency Plus", desc: "More potent, less yield.", potency: 1.2, yield: 0.9, nutrientFeed: 15 },
    balanced: { name: "Balanced Blend", desc: "Slight boost to both.", potency: 1.1, yield: 1.1, nutrientFeed: 18 },
    fungal: { name: "Fungal Fizz", desc: "Risk of mold, big yields!", potency: 0.8, yield: 1.3, nutrientFeed: 30 },
    bonebroth: { name: "Bone Broth", desc: "Super potent, stunts growth.", potency: 1.3, yield: 0.8, nutrientFeed: 12 },
    phantom: { name: "Phantom Dew", desc: "Ghostly, high yield, low flavor.", potency: 1.0, yield: 1.3, nutrientFeed: 22 },
    rotjuice: { name: "Rot Juice", desc: "Smells bad, drains everything.", potency: 0.7, yield: 0.7, nutrientFeed: 8 },
    cosmic: { name: "Cosmic Compost", desc: "Unpredictable, sometimes amazing.", potency: 1.4, yield: 1.0, nutrientFeed: 20 },
    doomdust: { name: "Doom Dust", desc: "Dangerous, huge yields if you survive.", potency: 0.6, yield: 1.4, nutrientFeed: 28 }
};

// Fun, weird, and unique pest types
const pestTypes = [
    { name: "Space Slugs", damage: [4, 12], successRate: 0.5, message: "Space slugs are oozing over your plants!" },
    { name: "Brain Leeches", damage: [5, 15], successRate: 0.4, message: "Brain leeches are draining your plant's will to live!" },
    { name: "Crypt Mites", damage: [3, 10], successRate: 0.6, message: "Crypt mites are gnawing at your roots!" },
    { name: "Phantom Gnats", damage: [2, 8], successRate: 0.6, message: "Phantom gnats are haunting your soil!" },
    { name: "Mutant Aphids", damage: [6, 18], successRate: 0.35, message: "Mutant aphids are swarming your crop!" },
    { name: "Eyeball Spiders", damage: [5, 15], successRate: 0.3, message: "Eyeball spiders are staring at your leaves!" },
    { name: "Mini Martians", damage: [4, 14], successRate: 0.45, message: "Mini martians are abducting your nutrients!" },
    { name: "Fungal Gremlins", damage: [3, 12], successRate: 0.5, message: "Fungal gremlins are causing chaos in your soil!" }
];

// Fun, weird, and unique raider types
const raidTypes = [
    { name: "Crypt Bandits", damage: [10, 20], successRate: 0.3, message: "Crypt bandits are sneaking into your garden!" },
    { name: "Mutant Chickens", damage: [8, 18], successRate: 0.35, message: "Mutant chickens are pecking at your stash!" },
    { name: "Alien Harvesters", damage: [15, 25], successRate: 0.2, message: "Alien harvesters are beaming up your buds!" },
    { name: "Spectral Thieves", damage: [12, 22], successRate: 0.25, message: "Spectral thieves are phasing through your defenses!" },
    { name: "Corporate Thieves", damage: [20, 30], successRate: 0.25, message: "Corporate security forces are attempting to seize your crop!" },
    { name: "Mutant Horde", damage: [25, 35], successRate: 0.15, message: "A horde of mutants is descending on your grow site!" },
    { name: "Zombie Gardeners", damage: [10, 20], successRate: 0.3, message: "Zombie gardeners are pruning your plants... badly!" }
];

// Fun and funny acts of god
const actsOfGod = [
    // Water
    { type: 'water', message: "Your mom's thirsty! There was a drought.", effect: (plant) => { plant.water = Math.max(10, plant.water - 30); } },
    { type: 'water', message: "A pipe burst and flooded the street. Water supply is cut!", effect: (plant) => { plant.water = Math.max(10, plant.water - 30); } },
    { type: 'water', message: "A rain of frogs absorbs all your water!", effect: (plant) => { plant.water = Math.max(10, plant.water - 30); } },
    // Light
    { type: 'light', message: "A solar eclipse darkens the sky!", effect: (plant) => { plant.light = Math.max(10, plant.light - 30); } },
    { type: 'light', message: "A dust storm blocks out the sun!", effect: (plant) => { plant.light = Math.max(10, plant.light - 30); } },
    { type: 'light', message: "Cosmic rays mutate your crop!", effect: (plant) => { plant.light = Math.max(10, plant.light - 30); } },
    // Nutrients
    { type: 'nutrients', message: "Hungry raccoons raided your compost pile!", effect: (plant) => { plant.nutrients = Math.max(10, plant.nutrients - 30); } },
    { type: 'nutrients', message: "Toxic runoff ruined your fertilizer batch!", effect: (plant) => { plant.nutrients = Math.max(10, plant.nutrients - 30); } },
    { type: 'nutrients', message: "A wormhole sucked up your nutrients!", effect: (plant) => { plant.nutrients = Math.max(10, plant.nutrients - 30); } },
    // Wild/funny
    { type: 'wild', message: "A time traveler swapped your plant with a weaker version!", effect: (plant) => { plant.health = Math.max(10, plant.health - 30); } },
    { type: 'wild', message: "A poltergeist rearranged your garden!", effect: (plant) => { plant.stress = Math.min(100, plant.stress + 30); } }
];

// Add a flag to track if an act of god has occurred
var actOfGodOccurred = false;
var actOfGodTimeout = null;

// Utility to pick 3 random seeds
function getRandomSeeds() {
    const keys = Object.keys(seedProperties);
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    return keys.slice(0, 3);
}

// Render 3 random seeds on the selection screen
function renderSeedOptions() {
    const chosenSeeds = getRandomSeeds();
    const seedOptionsDiv = document.querySelector('.seed-options');
    seedOptionsDiv.innerHTML = '';
    chosenSeeds.forEach(key => {
        const seed = seedProperties[key];
        const div = document.createElement('div');
        div.className = 'seed-option';
        div.setAttribute('data-seed-type', key);
        div.innerHTML = `
            <img src=\"img/selections/${seed.image}\" alt=\"${seed.name}\" class=\"seed-img\" />
            <div class=\"seed-name\">${seed.name}</div>
        `;
        seedOptionsDiv.appendChild(div);
    });
    // Re-attach event listeners for new options
    document.querySelectorAll('.seed-option').forEach(function(option) {
    option.addEventListener('click', function() {
            document.querySelectorAll('.seed-option').forEach(function(opt) {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        plant.seedType = option.getAttribute('data-seed-type');
        updateStartButton();
    });
});
}

// Call renderSeedOptions on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSeedOptions);
} else {
    renderSeedOptions();
}

// Set up soil selection
var soilOptions = document.querySelectorAll('.soil-option');
soilOptions.forEach(function(option) {
    option.addEventListener('click', function() {
        // Remove selected class from all soil options
        soilOptions.forEach(function(opt) {
            opt.classList.remove('selected');
        });
        // Add selected class to clicked option
        option.classList.add('selected');
        // Store selected soil type
        plant.soilType = option.getAttribute('data-soil-type');
        updateStartButton();
    });
});

// Update start button state
function updateStartButton() {
    startButton.disabled = !(plant.seedType && plant.soilType && plant.defenseType);
}

// Start the game
function startGame() {
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');
    var gameContainer = document.getElementById('gameContainer');
    gameContainer.classList.remove('hidden');
    
    // Show feeding schedule configuration
    showFeedingScheduleConfig();
}

// Randomly trigger pest events during growth
function maybeTriggerEvent() {
    if (pestActive || raiderActive || nutrientActive || plant.growthStage >= growthStages.length - 1) return;

    // Acts of god: only once per game, triggered by timer
    // (No longer random per tick)
    // Flowering stage: can trigger raiders or nutrient boost
    if (growthStages[plant.growthStage].name === 'Flowering') {
        // 15% chance for raiders, 10% for nutrient boost
        var rand = Math.random();
        if (rand < 0.10) {
            showNutrientEvent();
        } else if (rand < 0.25) {
            showRaiderEvent();
        }
    } else {
        // 20% chance for pests (increased from 15%)
        if (Math.random() < 0.20) {
            showPestEvent();
        }
    }
}

function showPestEvent() {
    pestActive = true;
    const pestType = pestTypes[Math.floor(Math.random() * pestTypes.length)];
    addEventToLog(`${pestType.message}`, 'warning');
    // If Grower defense, block pest penalty
    if (plant.defenseType === 'grower') {
        setTimeout(function() {
            addEventToLog('Your Grower defended against the pests!', 'info');
            pestActive = false;
        }, 2000);
        return;
    }
    // Random chance to successfully defend against pests
    const defenseSuccess = Math.random() < pestType.successRate;
    setTimeout(function() {
        if (defenseSuccess) {
            addEventToLog(`${pestType.name} were successfully repelled!`, 'info');
        } else {
            const damagePercent = Math.floor(Math.random() * (pestType.damage[1] - pestType.damage[0])) + pestType.damage[0];
            plant.pestPenalty *= (1 - (damagePercent / 100));
            addEventToLog(`${pestType.name} reduced potency by ${damagePercent}%.`, 'error');
        }
        pestActive = false;
    }, 10000);
}

function showRaiderEvent() {
    raiderActive = true;
    const raidType = raidTypes[Math.floor(Math.random() * raidTypes.length)];
    addEventToLog(`${raidType.message}`, 'warning');
    // If Hound defense, block raider penalty
    if (plant.defenseType === 'hound') {
        setTimeout(function() {
            addEventToLog('Your Hound chased off the raiders!', 'info');
            raiderActive = false;
        }, 2000);
        return;
    }
    // Random chance to successfully defend against raiders
    const defenseSuccess = Math.random() < raidType.successRate;
    setTimeout(function() {
        if (defenseSuccess) {
            addEventToLog(`${raidType.name} were successfully repelled!`, 'info');
        } else {
            const damagePercent = Math.floor(Math.random() * (raidType.damage[1] - raidType.damage[0])) + raidType.damage[0];
            plant.raiderPenalty *= (1 - (damagePercent / 100));
            addEventToLog(`${raidType.name} reduced yield by ${damagePercent}%.`, 'error');
        }
        raiderActive = false;
    }, 10000);
}

function showNutrientEvent() {
    nutrientActive = true;
    addEventToLog('Nutrient boost available!', 'info');
    
    // Random chance to get a nutrient boost
    const boostSuccess = Math.random() < 0.5; // 50% chance to get boost
    
    setTimeout(function() {
        if (boostSuccess) {
            const boostPercent = Math.floor(Math.random() * 10) + 5; // Random boost between 5-15%
            plant.potencyBoost *= (1 + (boostPercent / 100));
            addEventToLog(`Nutrient boost applied! Potency increased by ${boostPercent}%.`, 'info');
        } else {
            addEventToLog('Nutrient boost opportunity missed.', 'info');
        }
        nutrientActive = false;
    }, 10000);
}

// --- 3x Speed Toggle ---
let gameSpeed = 1; // 1x by default
let growthTimerInterval = 1000; // ms
function setGameSpeed(mult) {
    if (mult === 1) {
        gameSpeed = 1;
        gameSpeedMultiplier = 1;
    } else if (mult === 2) {
        gameSpeed = 2;
        gameSpeedMultiplier = 2;
    } else if (mult === 3) {
        gameSpeed = 3;
        gameSpeedMultiplier = 3;
    } else if (mult === 10) {
        gameSpeed = 10;
        gameSpeedMultiplier = 10;
    }
    growthTimerInterval = 1000 / gameSpeed; // Update the interval
    // If a growth timer is running, restart it at new speed
    if (plant.growthTimer) {
        clearInterval(plant.growthTimer);
        startGrowthTimer();
    }
    updatePlantStatus();
}
document.addEventListener('DOMContentLoaded', function() {
    const speedBtn = document.getElementById('toggleSpeedBtn');
    if (speedBtn) {
        speedBtn.addEventListener('click', function() {
            if (gameSpeed === 1) {
                setGameSpeed(2);
                speedBtn.textContent = '2x Speed';
            } else if (gameSpeed === 2) {
                setGameSpeed(3);
                speedBtn.textContent = '3x Speed';
            } else if (gameSpeed === 3) {
                setGameSpeed(10);
                speedBtn.textContent = '10x Speed';
            } else {
                setGameSpeed(1);
                speedBtn.textContent = '1x Speed';
            }
        });
        // Set initial state
        setGameSpeed(1);
        speedBtn.textContent = '1x Speed';
    }
});
// Patch startGrowthTimer to use growthTimerInterval
function startGrowthTimer() {
    if (plant.growthTimer) {
        clearInterval(plant.growthTimer);
    }
    feedingTick = 0; // Reset feeding tick on timer start
    plant.growthTimer = setInterval(function() {
        // Drain water and nutrients each tick
        if (plant.seedType && plant.soilType) {
            // Soil only affects water drain
            const soil = soilTypes[plant.soilType];
            const stageTicks = growthStages[plant.growthStage].time;
            const waterDrain = soil.waterDrain; // Only soil
            const nutrientDrain = 0.5; // Flat drain for all soils
            plant.water = Math.max(0, plant.water - waterDrain);
            plant.nutrients = Math.max(0, plant.nutrients - nutrientDrain);
        }
        // Feeding logic
        feedingTick++;
        const stageKey = ['sprout', 'vegetative', 'flowering'][plant.growthStage] || 'flowering';
        const schedule = plant.feedingSchedule[stageKey];
        if (schedule && schedule.waterTimes > 0) {
            const feedInterval = Math.max(1, Math.floor(growthStages[plant.growthStage].time / schedule.waterTimes));
            if (feedingTick % feedInterval === 0) {
                plant.water = Math.min(100, plant.water + 20); // always +20 water
                // Nutrient feed amount depends on mix for this stage
                let nuteAmount = 15;
                if (schedule.nutrientMix && nutrientMixes[schedule.nutrientMix]) {
                    nuteAmount = nutrientMixes[schedule.nutrientMix].nutrientFeed;
                }
                plant.nutrients = Math.min(100, plant.nutrients + nuteAmount);
                // Apply nutrient mix effects (only once per stage, so only apply if feedingTick === feedInterval)
                if (schedule.nutrientMix && nutrientMixes[schedule.nutrientMix]) {
                    if (!plant[stageKey + 'NutrientApplied']) {
                        plant.potencyBoost *= nutrientMixes[schedule.nutrientMix].potency;
                        plant.weight *= nutrientMixes[schedule.nutrientMix].yield;
                        plant[stageKey + 'NutrientApplied'] = true;
                    }
                }
            }
        }
        // Update plant health based on resources
        updatePlantStatus();
        // --- Ensure healthSum and healthTicks are updated every tick ---
        plant.healthSum += plant.health;
        plant.healthTicks++;
        // Update light efficiency for potency
        var maxDiff = 100;
        var diff = Math.abs(plant.light - plant.optimalLight);
        var efficiency = Math.max(0, 1 - (diff / maxDiff));
        plant.lightEfficiencySum += efficiency;
        plant.lightEfficiencyTicks++;
        maybeTriggerEvent();
        if (plant.stageTime >= growthStages[plant.growthStage].time) {
            // Reset nutrient applied flag for next stage
            plant[stageKey + 'NutrientApplied'] = false;
            feedingTick = 0;
            advanceGrowthStage();
        }
        plant.stageTime++;
        updatePlantDisplay();
    }, growthTimerInterval);
    console.log('GROWTH TIMER STARTED, interval:', growthTimerInterval);
}

// Advance to next growth stage
function advanceGrowthStage() {
    if (plant.growthStage < growthStages.length - 2) { // Only randomize if not about to harvest
        plant.growthStage++;
        plant.stageTime = 0;
        // Set a new random optimal light value (between 30 and 90)
        plant.optimalLight = Math.floor(Math.random() * 61) + 30;
        updatePlantDisplay();
    } else if (plant.growthStage < growthStages.length - 1) {
        plant.growthStage++;
        plant.stageTime = 0;
        updatePlantDisplay();
    } else {
        // Plant is ready for harvest
        clearInterval(plant.growthTimer);
        // Freeze all relevant stats for fair harvest
        plant.frozenStats = {
            healthSum: plant.healthSum,
            healthTicks: plant.healthTicks,
            lightEfficiencySum: plant.lightEfficiencySum,
            lightEfficiencyTicks: plant.lightEfficiencyTicks,
            pestPenalty: plant.pestPenalty,
            raiderPenalty: plant.raiderPenalty,
            potencyBoost: plant.potencyBoost,
            weight: plant.weight,
            potency: plant.potency,
            light: plant.light, // freeze current light
            water: plant.water,
            nutrients: plant.nutrients,
            stress: plant.stress,
            optimalLight: plant.optimalLight // freeze optimal light
        };
        // Prevent any further updates to plant state after harvest
        plant.growthTimer = null;
        plant.harvestTimer = null;
        plant.scoresRecorded = false; // ensure this is reset for each harvest
        autoHarvestPlant();
    }
}

function autoHarvestPlant() {
    // Use frozenStats for fair harvest calculation
    let stats = plant.frozenStats || plant;
    // Calculate average health
    let avgHealth = stats.healthTicks > 0 ? stats.healthSum / stats.healthTicks / 100 : 1;
    // Calculate average light efficiency
    let avgLightEff = stats.lightEfficiencyTicks > 0 ? stats.lightEfficiencySum / stats.lightEfficiencyTicks : 1;
    // Combine for yield and potency with separate penalties
    let finalPotencyRaw = stats.potency * avgLightEff * stats.potencyBoost * stats.pestPenalty;
    let finalWeightRaw = stats.weight * avgHealth * stats.raiderPenalty;
    // Scale potency so perfect play is 66%
    let finalPotency = Math.round(finalPotencyRaw * 0.66);
    let finalWeight = Math.round(finalWeightRaw); // <-- This is the correct yield calculation
    finalPotency = Math.max(0, Math.min(100, finalPotency));
    finalWeight = Math.max(0, Math.min(stats.weight, finalWeight)); // Clamp to max possible weight
    // Debug log for harvest calculation
    console.log('HARVEST DEBUG:', {
        avgHealth,
        avgLightEff,
        pestPenalty: stats.pestPenalty,
        raiderPenalty: stats.raiderPenalty,
        potencyBoost: stats.potencyBoost,
        potency: stats.potency,
        weight: stats.weight,
        finalPotencyRaw,
        finalPotency,
        finalWeightRaw,
        finalWeight,
        healthSum: stats.healthSum,
        healthTicks: stats.healthTicks,
        lightEfficiencySum: stats.lightEfficiencySum,
        lightEfficiencyTicks: stats.lightEfficiencyTicks,
        optimalLight: stats.optimalLight,
        light: stats.light
    });
    // Always allow score registration at harvest
    if (!plant.scoresRecorded && finalPotency !== null && finalWeight !== null && plant.frozenStats) {
        addScore('potency', finalPotency);
        addScore('yield', finalWeight);
        plant.scoresRecorded = true;
    }
    showHarvestResults(finalPotency, finalWeight); // Pass the calculated values
}

// Update plant status
function updatePlantStatus() {
    const lightDiff = Math.abs(plant.light - plant.optimalLight);
    // Softer stress logic
    if (lightDiff > 35) {
        plant.stress = Math.min(100, plant.stress + 1);
    } else {
        plant.stress = Math.max(0, plant.stress - 3); // recover faster
    }
    if (plant.water <= 0 || plant.nutrients <= 0) {
        plant.stress = Math.min(100, plant.stress + 2);
    } else if (plant.water < 30 || plant.nutrients < 30) {
        plant.stress = Math.min(100, plant.stress + 1);
    } else if (plant.water > 95 || plant.nutrients > 95) {
        plant.stress = Math.min(100, plant.stress + 1);
    }
    // Health penalty: only 1 per tick if anything is bad
    let healthPenalty = 0;
    if (plant.water < 30 || plant.water > 95) healthPenalty = 1;
    if (plant.nutrients < 30 || plant.nutrients > 95) healthPenalty = 1;
    if (lightDiff > 35) healthPenalty = 1;
    if (plant.stress > 80) healthPenalty = 1;
    plant.health -= healthPenalty;
    if (plant.health < 0) plant.health = 0;
    if (plant.health > 100) plant.health = 100;
    if (plant.health <= 0) {
        plant.deathTicks = (plant.deathTicks || 0) + 1;
        if (plant.deathTicks >= 3) {
            gameOver();
            return;
        }
    } else {
        plant.deathTicks = 0;
    }
    ViewService.updatePlantStatus(plant);
}

function updateResourceDisplay() {
    ViewService.updateResourceDisplay({
        water: plant.water,
        light: plant.light,
        nutrients: plant.nutrients,
        stress: plant.stress
    });
}

// Update plant display
function updatePlantDisplay() {
    // Update strain name, stage, and health in top HUD
    const seedNames = {};
    Object.keys(seedProperties).forEach(key => { seedNames[key] = seedProperties[key].name; });
    var topStatusHud = document.getElementById('topStatusHud');
    if (topStatusHud && plant.seedType) {
        topStatusHud.innerHTML = `
            <div style='font-size:1.5em; color:#ffd700; font-family: "Press Start 2P", Courier, monospace; margin-bottom: 8px;'>${seedNames[plant.seedType] || plant.seedType}</div>
            <div style='font-size:1.2em; color:#bfcfff; font-family: "Press Start 2P", Courier, monospace;'>Stage: ${growthStages[plant.growthStage].name}</div>
            <div style='font-size:1.2em; color:#bfcfff; font-family: "Press Start 2P", Courier, monospace;'>Health: ${Math.round(plant.health)}%</div>
        `;
    }
    // Update plant stage image in left HUD
    var plantStageImage = document.getElementById('plantStageImage');
    if (plantStageImage) {
        // Show stale image if stress >= 50% in veg or flower
        let stageName = growthStages[plant.growthStage].name.toLowerCase();
        let useStale = false;
        let staleImg = '';
        if (plant.stress >= 50) {
            if (stageName === 'vegetative') {
                useStale = true;
                staleImg = 'vegstale.png';
            } else if (stageName === 'flowering') {
                useStale = true;
                staleImg = 'flowerstale.png';
            }
        }
        if (useStale) {
            plantStageImage.src = 'img/stages/' + staleImg;
        } else {
            plantStageImage.src = 'img/stages/' + growthStages[plant.growthStage].image;
        }
    }
    // --- NEW: Update seed and soil squares below plant animation ---
    var seedSquare = document.getElementById('seedSquare');
    var soilSquare = document.getElementById('soilSquare');
    if (seedSquare) {
        if (plant.seedType && seedProperties[plant.seedType]) {
            seedSquare.innerHTML = `<img src="img/selections/${seedProperties[plant.seedType].image}" alt="${seedProperties[plant.seedType].name}" /><div class="seed-name">${seedProperties[plant.seedType].name}</div>`;
        } else {
            seedSquare.innerHTML = '';
        }
    }
    if (soilSquare) {
        if (plant.soilType && soilTypes[plant.soilType]) {
            // Use a default image for soil, or add image property to soilTypes if available
            let soilImg = `soil1.png`;
            if (plant.soilType === 'graveblend') soilImg = 'soil2.png';
            if (plant.soilType === 'marrowmoss') soilImg = 'soil3.png';
            let soilName = '';
            if (plant.soilType === 'ossuary') soilName = 'Bone Dust';
            if (plant.soilType === 'graveblend') soilName = 'Magic Moss';
            if (plant.soilType === 'marrowmoss') soilName = 'Eh.. Not sure';
            soilSquare.innerHTML = `<img src="img/selections/${soilImg}" alt="${soilName}" /><div class="soil-name">${soilName}</div>`;
        } else {
            soilSquare.innerHTML = '';
        }
    }
    // Update resource bars in main game area with smooth transitions
    const waterLevel = document.getElementById('waterLevel');
    const lightLevel = document.getElementById('lightLevel');
    const nutrientLevel = document.getElementById('nutrientLevel');
    const stressLevel = document.getElementById('stressLevel');
    
    if (waterLevel) {
        waterLevel.style.transition = 'width 0.1s linear';
        waterLevel.style.width = plant.water + '%';
    }
    if (lightLevel) {
        lightLevel.style.transition = 'width 0.1s linear';
        // Light bar: fill based on proximity to optimal value
        var maxDiff = 100;
        var diff = Math.abs(plant.light - plant.optimalLight);
        var efficiency = Math.max(0, 100 - (diff / maxDiff) * 100); // 100% if perfect, 0% if farthest
        lightLevel.style.width = efficiency + '%';
    }
    if (nutrientLevel) {
        nutrientLevel.style.transition = 'width 0.1s linear';
        nutrientLevel.style.width = plant.nutrients + '%';
    }
    if (stressLevel) {
        stressLevel.style.transition = 'width 0.1s linear';
        stressLevel.style.width = plant.stress + '%';
        // Animate color from grey to red as stress increases
        function lerpColor(a, b, t) {
            const ah = a.match(/\w\w/g).map(x => parseInt(x, 16));
            const bh = b.match(/\w\w/g).map(x => parseInt(x, 16));
            const rh = ah.map((v, i) => Math.round(v + (bh[i] - v) * t));
            return `#${rh.map(x => x.toString(16).padStart(2, '0')).join('')}`;
        }
        const base = '23232b';
        const red = 'ff1744';
        const t = Math.max(0, Math.min(1, plant.stress / 100));
        const color = lerpColor(base, red, t);
        stressLevel.style.setProperty('--stress-color', color);
    }

    // Update growth progress bar
    var elapsed = 0;
    for (var i = 0; i < plant.growthStage; i++) {
        elapsed += growthStages[i].time;
    }
    elapsed += plant.stageTime;
    var percent = Math.min(100, Math.round((elapsed / plant.totalGrowthTime) * 100));
    document.getElementById('growthProgress').style.width = percent + '%';
}

// Add new harvest-related functions
function showHarvestWindow() {
    document.getElementById('harvestWindow').classList.remove('hidden');
    startHarvestTimer();
    // Calculate final scores for display only
    const finalPotency = Math.min(100, Math.round(plant.frozenStats.potency * plant.frozenStats.pestPenalty * plant.frozenStats.potencyBoost));
    const finalWeight = Math.min(100, Math.round(plant.frozenStats.weight * plant.frozenStats.raiderPenalty));
    // Update display
    document.getElementById('currentPotency').textContent = finalPotency;
    document.getElementById('currentWeight').textContent = finalWeight;
    // (No more addScore here)
}

function startHarvestTimer() {
    if (plant.harvestTimer) {
        clearInterval(plant.harvestTimer);
    }
    
    plant.harvestTimer = setInterval(function() {
        plant.harvestTimeLeft--;
        
        // Calculate potency and weight loss
        const hoursPassed = (24 * 60 * 60 - plant.harvestTimeLeft) / 3600;
        plant.potency = Math.max(0, 100 - (hoursPassed * 2)); // 2% loss per hour
        plant.weight = Math.max(0, 100 - (hoursPassed * 1.5)); // 1.5% loss per hour
        
        // Update display
        updateHarvestDisplay();
        
        if (plant.harvestTimeLeft <= 0) {
            clearInterval(plant.harvestTimer);
            // Auto-harvest when timer reaches 0
            harvestPlant();
        }
    }, 1000);
}

function updateHarvestDisplay() {
    const hours = Math.floor(plant.harvestTimeLeft / 3600);
    const minutes = Math.floor((plant.harvestTimeLeft % 3600) / 60);
    const seconds = plant.harvestTimeLeft % 60;
    document.getElementById('harvestCountdown').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    // Use frozen stats if available
    let stats = plant.frozenStats || plant;
    // Calculate average health
    let avgHealth = 1;
    if (stats.healthTicks > 0) {
        avgHealth = stats.healthSum / stats.healthTicks / 100;
    }
    // Calculate average light efficiency
    let avgLightEff = 1;
    if (stats.lightEfficiencyTicks > 0) {
        avgLightEff = stats.lightEfficiencySum / stats.lightEfficiencyTicks;
    }
    // Combine for yield and potency with separate penalties
    const currentPotencyRaw = Math.round(stats.potency * avgLightEff * stats.potencyBoost * stats.pestPenalty);
    const currentWeight = Math.round(stats.weight * avgHealth * stats.raiderPenalty);
    // Scale potency so perfect play is 66%
    const currentPotency = Math.round(currentPotencyRaw * 0.66);
    document.getElementById('currentPotency').textContent = currentPotency;
    document.getElementById('currentWeight').textContent = currentWeight;
}

function harvestPlant() {
    // Only allow harvesting if the plant is mature (harvest window is open)
    const harvestWindow = document.getElementById('harvestWindow');
    if (!harvestWindow || harvestWindow.classList.contains('hidden')) return;
    clearInterval(plant.harvestTimer);
    harvestWindow.classList.add('hidden');
    // Use current values for potency and weight (after countdown/penalties)
    let finalPotency = plant.potency;
    let finalWeight = plant.weight;
    // If null, fallback to frozenStats (for legacy/edge cases)
    if (finalPotency == null && plant.frozenStats) {
        finalPotency = plant.frozenStats.potency;
    }
    if (finalWeight == null && plant.frozenStats) {
        finalWeight = plant.frozenStats.weight;
    }
    // Clamp and validate
    finalPotency = Math.max(0, Math.min(100, Math.round(finalPotency)));
    finalWeight = Math.max(0, Math.min(100, Math.round(finalWeight)));
    // Only record if values are valid and plant is mature
    if (!plant.scoresRecorded && finalPotency !== null && finalWeight !== null && plant.frozenStats) {
        addScore('potency', finalPotency);
        addScore('yield', finalWeight);
        plant.scoresRecorded = true;
    }
    showHarvestResults(finalPotency, finalWeight);
}

function showHarvestResults(finalPotency, finalWeight) {
    const resultsDiv = document.getElementById('harvestResults');
    if (!resultsDiv) return;
    document.getElementById('finalStrainName').textContent = seedProperties[plant.seedType].name;
    document.getElementById('finalWeight').textContent = `${finalWeight}g`;
    document.getElementById('finalPotency').textContent = `${finalPotency}%`;
    let seedBankDiv = document.getElementById('seedBankDisplay');
    let finalPlantImage = document.getElementById('finalPlantImage');
    
    // Always show yield results
    seedBankDiv.innerHTML = '';
    if (finalPlantImage) {
        finalPlantImage.src = 'img/stages/yield.png';
        finalPlantImage.alt = 'Harvested Yield';
        finalPlantImage.style.width = '200px';
        finalPlantImage.style.height = '200px';
        finalPlantImage.style.objectFit = 'cover';
        finalPlantImage.style.borderRadius = '8px';
        finalPlantImage.style.border = '2px solid #bfcfff';
        finalPlantImage.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.3)';
        finalPlantImage.style.display = 'block';
        finalPlantImage.style.margin = '1.5rem auto';
    }
    
    // Always record scores
    if (!plant.scoresRecorded && finalPotency !== null && finalWeight !== null && plant.frozenStats) {
        addScore('potency', finalPotency);
        addScore('yield', finalWeight);
        plant.scoresRecorded = true;
    }
    
    updateHighScoresDisplay();
    resultsDiv.classList.remove('hidden');
    updateSeedBankSelectionDisplay();
}

// Add event listener for harvest button
document.addEventListener('DOMContentLoaded', function() {
    const harvestBtn = document.getElementById('harvestBtn');
    if (harvestBtn) {
        harvestBtn.addEventListener('click', harvestPlant);
    }
    const resetBtn = document.getElementById('resetHighScoresBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (isGameLive()) {
                alert('You cannot reset high scores while a game is live! Please finish or end your current game first.');
                return;
            }
            if (confirm('Are you sure you want to reset all high scores?')) {
                localStorage.removeItem('marrowGrowHighScores');
                localStorage.removeItem('marrowGrowLastGrower');
                location.reload();
            }
        });
    }
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', function() {
            // Reset plant state (but not high scores)
            Object.assign(plant, {
                seedType: null,
                soilType: null,
                health: 100,
                water: 100,
                light: Math.floor(Math.random() * 101), // random light 0-100
                nutrients: 100,
                stress: 0,
                growthStage: 0,
                growthTimer: null,
                stageTime: 0,
                totalGrowthTime: 0,
                harvestTimer: null,
                harvestTimeLeft: 24 * 60 * 60,
                potency: 100, // set to starting value
                weight: 1000, // set to starting value
                healthSum: 0,
                healthTicks: 0,
                optimalLight: 100,
                pestPenalty: 1,
                raiderPenalty: 1,
                lightEfficiencySum: 0,
                lightEfficiencyTicks: 0,
                potencyBoost: 1,
                feedingSchedule: {
                    sprout: { waterTimes: 0, nutrientMix: null },
                    vegetative: { waterTimes: 0, nutrientMix: null },
                    flowering: { waterTimes: 0, nutrientMix: null }
                },
                lastWaterTime: 0,
                lastFeedTime: 0,
                overWatered: false,
                overFed: false,
                overWateredTime: 0,
                overFedTime: 0,
                scoresRecorded: false,
                frozenStats: undefined // ensure this is reset
            });
            // Hide harvest results
            const resultsDiv = document.getElementById('harvestResults');
            if (resultsDiv) resultsDiv.classList.add('hidden');
            // Show selection screen
            document.getElementById('selectionScreen').classList.remove('hidden');
            document.getElementById('gameSection').classList.add('hidden');
            // Re-render seed options for new game
            if (typeof renderSeedOptions === 'function') renderSeedOptions();
        });
    }
    const toolsTabLabel = document.getElementById('toolsTabLabel');
    const toolsTab = document.getElementById('toolsTab');
    if (toolsTabLabel && toolsTab) {
        toolsTabLabel.addEventListener('click', function() {
            toolsTab.classList.toggle('open');
        });
    }
});

// Modify showGameComplete to use new harvest system
function showGameComplete() {
    showHarvestWindow();
}

// Replace showFeedingScheduleConfig with a full-page feeder UI
function showFeedingScheduleConfig() {
    // Remove any existing config
    const oldConfig = document.getElementById('feedingScheduleConfig');
    if (oldConfig) oldConfig.remove();
    // Hide other sections
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    // Create full-page config
    const configDiv = document.createElement('div');
    configDiv.id = 'feedingScheduleConfig';
    configDiv.className = 'feeding-schedule-config-fullpage';
    configDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #1a1a24 0%, #23141c 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 1000;
    `;
    
    configDiv.innerHTML = `
        <div class="feeding-header" style="text-align: center; margin-bottom: 40px; width: 100%; display: flex; flex-direction: column; align-items: center;">
            <h2 style="color: #e0e0e0; font-family: 'Press Start 2P', monospace; font-size: 2em; margin-bottom: 10px; text-shadow: 0 0 10px rgba(224, 224, 224, 0.3);">
                Feeding Schedule
            </h2>
            <p style="color: #bfcfff; font-family: monospace; font-size: 1.1em; opacity: 0.8; max-width: 600px;">
                Configure watering frequency and nutrient mix for each growth stage
            </p>
        </div>
        <form id="scheduleForm" style="display: flex; gap: 30px; align-items: stretch; justify-content: center; max-width: 1200px; margin: 0 auto;">
            ${['Sprout','Vegetative','Flowering'].map(stage => `
            <div class="stage-schedule-block" style="background: rgba(35, 35, 43, 0.6); backdrop-filter: blur(10px); border: 2px solid rgba(224, 224, 224, 0.1); border-radius: 15px; padding: 25px; min-width: 280px; display: flex; flex-direction: column; gap: 20px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
                <div style="text-align: center;">
                    <h3 style="color: #ffd700; font-family: 'Press Start 2P', monospace; font-size: 1.2em; margin-bottom: 8px;">${stage} Stage</h3>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 15px 0;">
                    <button type="button" class="water-btn minus-btn" data-stage="${stage.toLowerCase()}" data-type="minus">-</button>
                    <div class="water-display">
                        <span id="${stage.toLowerCase()}WaterCircle">0</span>
                    </div>
                    <button type="button" class="water-btn plus-btn" data-stage="${stage.toLowerCase()}" data-type="plus">+</button>
                </div>
                <div class="nutrient-scroll-wheel" id="${stage.toLowerCase()}NutrientWheel"></div>
            </div>
            `).join('')}
        </form>
        <div class="feeding-buttons-row" style="display: flex; justify-content: center; gap: 32px; margin-top: 36px;">
            <button id="randomFeedsBtn" type="button" style="background: linear-gradient(135deg, #4a4a55 0%, #34343f 100%); color: #e0e0e0; border: none; border-radius: 15px; padding: 0; font-family: 'Press Start 2P', monospace; font-size: 1.1em; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); width: 240px; height: 56px; display: flex; align-items: center; justify-content: center;">Random</button>
            <button id="saveScheduleBtn" type="button" style="background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: #ffffff; border: none; border-radius: 15px; padding: 0; font-family: 'Press Start 2P', monospace; font-size: 1.1em; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); width: 240px; height: 56px; display: flex; align-items: center; justify-content: center;">Start Growing</button>
        </div>
    `;
    document.body.appendChild(configDiv);

    // State for water times and nutrient mix
    const mixKeys = Object.keys(nutrientMixes);
    const scheduleState = {
        sprout: { waterTimes: 0, nutrientMix: mixKeys[0] },
        vegetative: { waterTimes: 0, nutrientMix: mixKeys[0] },
        flowering: { waterTimes: 0, nutrientMix: mixKeys[0] }
    };

    // Render scroll wheels with improved styling
    function renderScrollWheel(stage) {
        const wheel = document.getElementById(stage+"NutrientWheel");
        wheel.innerHTML = '';
        const selected = scheduleState[stage].nutrientMix;
        const selIdx = mixKeys.indexOf(selected);
        let indices = [];
        for (let i = -1; i <= 1; i++) {
            indices.push((selIdx + i + mixKeys.length) % mixKeys.length);
        }
        
        // Add scroll arrows
        wheel.insertAdjacentHTML('afterbegin', `
            <button type="button" class="scroll-arrow up" data-stage="${stage}">▲</button>
        `);
        
        indices.forEach((idx, i) => {
            const key = mixKeys[idx];
            const mix = nutrientMixes[key];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nutrient-option' + (i === 1 ? ' selected' : '');
            btn.setAttribute('data-stage', stage);
            btn.setAttribute('data-mix', key);
            // Use .mix-title and .mix-desc for text
            btn.innerHTML = `
                <div class="mix-title">${mix.name}</div>
                ${i === 1 ? `<div class="mix-desc">${mix.desc}</div>` : ''}
            `;
            btn.addEventListener('click', function() {
                scheduleState[stage].nutrientMix = key;
                renderScrollWheel(stage);
            });
            wheel.appendChild(btn);
        });
        
        wheel.insertAdjacentHTML('beforeend', `
            <button type="button" class="scroll-arrow down" data-stage="${stage}">▼</button>
        `);
        
        // Add click handlers for arrows
        wheel.querySelector('.scroll-arrow.up').onclick = function() {
            let idx = mixKeys.indexOf(scheduleState[stage].nutrientMix);
            idx = (idx - 1 + mixKeys.length) % mixKeys.length;
            scheduleState[stage].nutrientMix = mixKeys[idx];
            renderScrollWheel(stage);
        };
        wheel.querySelector('.scroll-arrow.down').onclick = function() {
            let idx = mixKeys.indexOf(scheduleState[stage].nutrientMix);
            idx = (idx + 1) % mixKeys.length;
            scheduleState[stage].nutrientMix = mixKeys[idx];
            renderScrollWheel(stage);
        };
    }

    // Initialize wheels
    ['sprout','vegetative','flowering'].forEach(stage => renderScrollWheel(stage));

    // Update UI
    function updateCircles() {
        ['sprout','vegetative','flowering'].forEach(stage => {
            document.getElementById(stage+'WaterCircle').textContent = scheduleState[stage].waterTimes;
        });
    }
    updateCircles();

    // Event handlers remain the same
    document.querySelectorAll('.water-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const stage = btn.getAttribute('data-stage');
            const type = btn.getAttribute('data-type');
            if (type === 'plus') {
                scheduleState[stage].waterTimes = Math.min(12, scheduleState[stage].waterTimes + 1);
            } else {
                scheduleState[stage].waterTimes = Math.max(0, scheduleState[stage].waterTimes - 1);
            }
            updateCircles();
        });
    });

    document.getElementById('randomFeedsBtn').addEventListener('click', function() {
        ['sprout','vegetative','flowering'].forEach(stage => {
            scheduleState[stage].waterTimes = Math.floor(Math.random() * 13); // 0-12
            const randMix = mixKeys[Math.floor(Math.random() * mixKeys.length)];
            scheduleState[stage].nutrientMix = randMix;
            updateCircles();
            renderScrollWheel(stage);
        });
    });

    document.getElementById('saveScheduleBtn').addEventListener('click', function() {
        plant.feedingSchedule = {
            sprout: { waterTimes: scheduleState.sprout.waterTimes, nutrientMix: scheduleState.sprout.nutrientMix },
            vegetative: { waterTimes: scheduleState.vegetative.waterTimes, nutrientMix: scheduleState.vegetative.nutrientMix },
            flowering: { waterTimes: scheduleState.flowering.waterTimes, nutrientMix: scheduleState.flowering.nutrientMix }
        };
        plant.lastWaterTime = Date.now();
        plant.lastFeedTime = Date.now();
        configDiv.remove();
        document.getElementById('gameSection').classList.remove('hidden');
        initializeGame();
    });
}

// New function to initialize the game after schedule is set
function initializeGame() {
    // Calculate total growth time
    var totalGrowthTime = 0;
    for (var i = 0; i < growthStages.length - 1; i++) {
        totalGrowthTime += growthStages[i].time;
    }
    plant.totalGrowthTime = totalGrowthTime;
    plant.healthSum = 0;
    plant.healthTicks = 0;
    plant.lightEfficiencySum = 0;
    plant.lightEfficiencyTicks = 0;
    plant.potencyBoost = 1;
    // Set initial optimal light
    plant.optimalLight = Math.floor(Math.random() * 61) + 30;
    // Set initial values to 80% instead of 50%
    plant.light = 80;
    plant.water = 80;
    plant.nutrients = 80;
    // Attach slider event
    setTimeout(function() {
        var lightSlider = document.getElementById('lightSlider');
        if (lightSlider) {
            lightSlider.value = plant.light; // set slider to random light
            lightSlider.addEventListener('input', function() {
                plant.light = parseInt(lightSlider.value);
                updatePlantDisplay();
            });
        }
    }, 100);
    // Update game container with notification section
    var gameContainer = document.getElementById('gameContainer');
    gameContainer.innerHTML = `
        <div id="topStatusHud" class="top-status-hud" style="text-align: center; margin-bottom: 18px;">
        </div>
        <div class="growth-progress-section">
            <label>Growth Progress</label>
            <div class="bar"><div id="growthProgress" class="level" style="width: 0%"></div></div>
        </div>
        <div class="resource-bars">
            <div class="resource">
                <label>Water</label>
                <div class="bar"><div id="waterLevel" class="level" style="width: 100%"></div></div>
            </div>
            <div class="resource">
                <label>Light</label>
                <div class="bar"><div id="lightLevel" class="level" style="width: 100%"></div></div>
            </div>
            <div class="resource">
                <label>Nutrients</label>
                <div class="bar"><div id="nutrientLevel" class="level" style="width: 100%"></div></div>
            </div>
            <div class="resource">
                <label>Stress</label>
                <div class="bar"><div id="stressLevel" class="level" style="width: 0%"></div></div>
            </div>
        </div>
        <div class="game-controls" style="display: flex; flex-direction: column; align-items: center; gap: 18px; margin-top: 18px;">
            <div class="light-control" style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <label for="lightSlider" style="color: #bfcfff; font-family: 'Press Start 2P', 'Courier New', Courier, monospace; font-size: 1em; margin-bottom: 6px;">Set Light</label>
                <input type="range" id="lightSlider" min="0" max="100" value="100" style="vertical-align: middle; width: 320px;">
            </div>
        </div>
        <div id="notificationSection" class="notification-section">
            <h3>Events</h3>
            <div id="eventLog" class="event-log"></div>
        </div>
    `;
    // Initialize game state
    plant.growthStage = 0;
    plant.stageTime = 0;
    // Run one tick to initialize averages
    updatePlantStatus();
    updatePlantDisplay();
    plant.healthSum += plant.health;
    plant.healthTicks++;
    var maxDiff = 100;
    var diff = Math.abs(plant.light - plant.optimalLight);
    var efficiency = Math.max(0, 1 - (diff / maxDiff));
    plant.lightEfficiencySum += efficiency;
    plant.lightEfficiencyTicks++;
    // Now start the timer
    startGrowthTimer(); // Ensure timer starts every game
    scheduleActOfGod();
    console.log('NEW GAME STARTED: Growth timer started.');
    feedingTick = 0;
    plant.sproutNutrientApplied = false;
    plant.vegetativeNutrientApplied = false;
    plant.floweringNutrientApplied = false;
}

// Schedule act of god once per game at a random time during growth
function scheduleActOfGod() {
    if (actOfGodOccurred || actOfGodTimeout) return;
    // Pick a random time between 20% and 80% of total growth time
    var min = Math.floor(plant.totalGrowthTime * 0.2);
    var max = Math.floor(plant.totalGrowthTime * 0.8);
    var triggerAt = Math.floor(Math.random() * (max - min)) + min;
    actOfGodTimeout = setTimeout(function() {
        if (!actOfGodOccurred) {
            const godEvent = actsOfGod[Math.floor(Math.random() * actsOfGod.length)];
            // 30% chance to deflect
            if (Math.random() < 0.3) {
                addEventToLog('The act of god was deflected by darker powers. Your plant is unharmed.', 'actofgod');
            } else {
                godEvent.effect(plant);
                addEventToLog(`Act of God: ${godEvent.message}`, 'actofgod');
            }
            actOfGodOccurred = true;
        }
    }, triggerAt * 1000); // plant.stageTime is in seconds
}

// Add new function to manage event log
function addEventToLog(message, type = 'info') {
    const eventLog = document.getElementById('eventLog');
    if (!eventLog) return;

    const eventElement = document.createElement('div');
    eventElement.className = `event-item ${type}`;
    eventElement.textContent = message;
    // No timestamp
    eventLog.insertBefore(eventElement, eventLog.firstChild);
    while (eventLog.children.length > 10) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Add a game over function
function gameOver() {
    clearInterval(plant.growthTimer);
    clearInterval(plant.harvestTimer);
    document.getElementById('gameSection').classList.add('hidden');
    
    // Show a simple game over screen
    let overDiv = document.getElementById('gameOverScreen');
    if (!overDiv) {
        overDiv = document.createElement('div');
        overDiv.id = 'gameOverScreen';
        overDiv.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#23141c;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;';
        overDiv.innerHTML = `
            <h1 style='color:#ff1744;font-family:"Press Start 2P",monospace;font-size:2.5em;margin-bottom:32px;'>Game Over</h1>
            <p style='font-size:1.3em;font-family:"Press Start 2P",monospace;margin-bottom:32px;'>Your plant died from neglect.<br>No harvest for you.</p>
            <button onclick='location.reload()' style='font-size:1.2em;padding:18px 48px;background:#bfcfff;color:#23141c;border:none;border-radius:8px;font-family:"Press Start 2P",monospace;cursor:pointer;'>Try Again</button>
        `;
        document.body.appendChild(overDiv);
    } else {
        overDiv.classList.remove('hidden');
    }
    
    // Reset current grower name
    currentGrower = '';
    document.getElementById('growerName').textContent = '';
}

// --- Seed Bank Logic ---
if (!highScores.seedBank) highScores.seedBank = {};

function addSeedToBank(seedType) {
    if (!currentGrower) return;
    if (!highScores.seedBank[currentGrower]) highScores.seedBank[currentGrower] = {};
    if (!highScores.seedBank[currentGrower][seedType]) highScores.seedBank[currentGrower][seedType] = 0;
    highScores.seedBank[currentGrower][seedType] += 1;
    saveHighScores();
}

function getSeedBank(seedType) {
    if (!currentGrower || !highScores.seedBank[currentGrower]) return 0;
    return highScores.seedBank[currentGrower][seedType] || 0;
}

// Ensure initialization on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadHighScores();
        initializeNameInput();
        updateHighScoresDisplay();
    });
} else {
    loadHighScores();
    initializeNameInput();
    updateHighScoresDisplay();
}

function updateSeedBankSelectionDisplay() {
    const el = document.getElementById('seedBankSelectionDisplay');
    if (el) {
        let strain = plant.seedType || Object.keys(seedProperties)[0];
        let multText = getStrainMultiplierText(strain);
        if (currentGrower && highScores.seedLives && typeof highScores.seedLives[currentGrower] === 'number') {
            el.innerHTML = `Seeds: <span style='color:#fff;'>${highScores.seedLives[currentGrower]}</span> <span style='color:#ffd700;font-size:0.9em;'>${multText}</span>`;
        } else {
            el.innerHTML = `Seeds: <span style='color:#fff;'>0</span> <span style='color:#ffd700;font-size:0.9em;'>${multText}</span>`;
        }
    }
}
// Call this in relevant places:
// After updateHighScoresDisplay, after setLivesForPlayer, after name input, after starting a game, after receiving a seed
const oldUpdateHighScoresDisplay = updateHighScoresDisplay;
updateHighScoresDisplay = function() {
    oldUpdateHighScoresDisplay.apply(this, arguments);
    updateSeedBankSelectionDisplay();
};
// Also call after name input confirm
// In initializeNameInput, after checkSeedLockoutUI();
// ...
// In showHarvestResults, after setLivesForPlayer and updateHighScoresDisplay, call updateSeedBankSelectionDisplay();
// ... 

// --- Seed Selection Lives Logic ---
let lastSelectedSeed = null;

function handleSeedSelection(option) {
    if (getLivesForPlayer() <= 0) {
        // Prevent selection if no seeds left
        return;
    }
    // Mark this as the new selected
    lastSelectedSeed = option;
    // Usual selection logic
    document.querySelectorAll('.seed-option').forEach(function(opt) {
        opt.classList.remove('selected');
    });
    option.classList.add('selected');
    plant.seedType = option.getAttribute('data-seed-type');
    updateStartButton();
}

// Attach this handler to seed options after rendering
function attachSeedSelectionHandlers() {
    document.querySelectorAll('.seed-option').forEach(function(option) {
        option.addEventListener('click', function() {
            handleSeedSelection(option);
        });
    });
}

// After rendering seed options, call attachSeedSelectionHandlers()
const oldRenderSeedOptions = renderSeedOptions;
renderSeedOptions = function() {
    oldRenderSeedOptions.apply(this, arguments);
    attachSeedSelectionHandlers();
};

// On name input confirm, reset lives to 3 if new player or after lockout
// (already handled in initializeNameInput)
// On start button click, do NOT decrement lives again (already decremented on selection)
// ... existing code ...

// --- Strain Multiplier System ---
function getStrainCount(strain) {
    return 0; // Always return 0 since we're not using multipliers
}

function incrementStrainCount(strain) {
    // Do nothing since we're not using multipliers
}

function getStrainMultiplier(strain) {
    return 0; // Always return 0 since we're not using multipliers
}

function getStrainMultiplierText(strain) {
    return ''; // Return empty string since we're not using multipliers
}

// Patch updateHighScoresDisplay and updateSeedBankSelectionDisplay to show multiplier
const oldUpdateSeedBankSelectionDisplay = updateSeedBankSelectionDisplay;
updateSeedBankSelectionDisplay = function() {
    const el = document.getElementById('seedBankSelectionDisplay');
    if (el) {
        let strain = plant.seedType || Object.keys(seedProperties)[0];
        let multText = getStrainMultiplierText(strain);
        if (currentGrower && highScores.seedLives && typeof highScores.seedLives[currentGrower] === 'number') {
            el.innerHTML = `Seeds: <span style='color:#fff;'>${highScores.seedLives[currentGrower]}</span> <span style='color:#ffd700;font-size:0.9em;'>${multText}</span>`;
        } else {
            el.innerHTML = `Seeds: <span style='color:#fff;'>0</span> <span style='color:#ffd700;font-size:0.9em;'>${multText}</span>`;
        }
    }
}
const oldUpdateHighScoresDisplay2 = updateHighScoresDisplay;
updateHighScoresDisplay = function() {
    oldUpdateHighScoresDisplay2.apply(this, arguments);
    // Also update multiplier in high scores column
    const seedBankScores = document.getElementById('seedBankScores');
    if (seedBankScores) {
        let strain = plant.seedType || Object.keys(seedProperties)[0];
        let multText = getStrainMultiplierText(strain);
        let base = seedBankScores.innerHTML.match(/Seeds: <span style='color:#fff;'>\d+<\/span>/);
        if (base) {
            seedBankScores.innerHTML = `${base[0]} <span style='color:#ffd700;font-size:0.9em;'>${multText}</span>`;
        }
    }
    oldUpdateSeedBankSelectionDisplay();
};
// Apply multiplier to final potency in showHarvestResults
const oldShowHarvestResults = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    // Apply multiplier if this is a flower yield (not a seed run)
    let strain = plant.seedType;
    let multiplier = getStrainMultiplier(strain);
    if (multiplier && finalPotency != null) {
        finalPotency = Math.round(finalPotency * (1 + multiplier));
    }
    oldShowHarvestResults(finalPotency, finalWeight);
    // Increment strain count if this was a flower yield (not a seed run)
    if (!plant.scoresRecorded) {
        incrementStrainCount(strain);
    }
};
// ... existing code ...

// --- Seed Streak Bonus ---
function getConsecutiveSeedHarvests() {
    return 0; // Always return 0 since we're not using streaks
}

function setConsecutiveSeedHarvests(val) {
    // Do nothing since we're not using streaks
}

// Patch showHarvestResults for streak logic
const oldShowHarvestResults2 = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    const resultsDiv = document.getElementById('harvestResults');
    if (!resultsDiv) return;
    // Pollination: 70% chance to get 1 seed
    let gotSeed = Math.random() < 0.7;
    let streak = getConsecutiveSeedHarvests();
    let bonusSeeds = 1;
    let streakBonus = false;
    if (gotSeed) {
        streak += 1;
        if (streak === 2) {
            bonusSeeds = 2;
            streakBonus = true;
            streak = 0; // reset after bonus
        }
        setConsecutiveSeedHarvests(streak);
    } else {
        setConsecutiveSeedHarvests(0);
    }
    // Now, call the original showHarvestResults with a patch for seed awarding
    let patch = {
        gotSeed,
        bonusSeeds,
        streakBonus
    };
    oldShowHarvestResults2._patch = patch;
    oldShowHarvestResults2.apply(this, arguments);
    oldShowHarvestResults2._patch = null;
};
// Patch the seed awarding logic in the original showHarvestResults
const oldShowHarvestResults3 = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    let patch = oldShowHarvestResults3._patch;
    const resultsDiv = document.getElementById('harvestResults');
    if (!resultsDiv) return;
    document.getElementById('finalStrainName').textContent = seedProperties[plant.seedType].name;
    document.getElementById('finalWeight').textContent = `${finalWeight}g`;
    document.getElementById('finalPotency').textContent = `${finalPotency}%`;
    let seedBankDiv = document.getElementById('seedBankDisplay');
    let finalPlantImage = document.getElementById('finalPlantImage');
    if (patch && patch.gotSeed) {
        // 25% chance of random pollination from a different seed type
        let pollinatedType = plant.seedType;
        if (Math.random() < 0.25) {
            const otherTypes = Object.keys(seedProperties).filter(type => type !== plant.seedType);
            pollinatedType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }
        setLivesForPlayer(getLivesForPlayer() + patch.bonusSeeds);
        saveHighScores();
        updateHighScoresDisplay();
        let pollMsg = pollinatedType === plant.seedType
            ? `+${patch.bonusSeeds} Seed${patch.bonusSeeds > 1 ? 's' : ''}!<br><span style='color:#bfcfff;font-size:0.8em;'>Total: ${getLivesForPlayer()}</span>`
            : `+${patch.bonusSeeds} Seed${patch.bonusSeeds > 1 ? 's' : ''}!<br><span style='color:#bfcfff;font-size:0.8em;'>Pollinated by ${seedProperties[pollinatedType].name}!<br>Total: ${getLivesForPlayer()}</span>`;
        if (patch.streakBonus) {
            pollMsg = `<span style='color:#ffd700;'>Seed Streak! </span>` + pollMsg;
        }
        seedBankDiv.innerHTML = `<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:10px;'>
            <div style='font-size:1em;color:#ffd700;font-family:"Press Start 2P",monospace;'>${pollMsg}</div>
        </div>`;
        if (finalPlantImage) {
            finalPlantImage.src = `img/selections/${seedProperties[pollinatedType].image}`;
            finalPlantImage.alt = `${seedProperties[pollinatedType].name} Seed`;
            finalPlantImage.style.width = '86px';
            finalPlantImage.style.height = '86px';
            finalPlantImage.style.objectFit = 'cover';
            finalPlantImage.style.borderRadius = '8px';
            finalPlantImage.style.border = '2px solid #bfcfff';
            finalPlantImage.style.boxShadow = '0 2px 8px #000a';
            finalPlantImage.style.display = 'block';
            finalPlantImage.style.margin = '1.5rem auto';
        }
        plant.scoresRecorded = true;
    } else {
        seedBankDiv.innerHTML = '';
        if (finalPlantImage) {
            finalPlantImage.src = 'img/stages/yield.png';
            finalPlantImage.alt = 'Harvested Yield';
            finalPlantImage.style.width = '200px';
            finalPlantImage.style.height = '200px';
            finalPlantImage.style.objectFit = 'cover';
            finalPlantImage.style.borderRadius = '8px';
            finalPlantImage.style.border = '2px solid #bfcfff';
            finalPlantImage.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.3)';
            finalPlantImage.style.display = 'block';
            finalPlantImage.style.margin = '1.5rem auto';
        }
        if (!plant.scoresRecorded && finalPotency !== null && finalWeight !== null && plant.frozenStats) {
            addScore('potency', finalPotency);
            addScore('yield', finalWeight);
            plant.scoresRecorded = true;
        }
    }
    updateHighScoresDisplay();
    resultsDiv.classList.remove('hidden');
    updateSeedBankSelectionDisplay();
};
// ... existing code ...

// --- Double Seed Bonus on Same Strain ---
function getLastHarvestedStrain() {
    return null; // Always return null since we're not using this feature
}

function setLastHarvestedStrain(strain) {
    // Do nothing since we're not using this feature
}

// Patch showHarvestResults for double logic
const oldShowHarvestResultsDouble = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    const resultsDiv = document.getElementById('harvestResults');
    if (!resultsDiv) return;
    // Pollination: 70% chance to get 1 seed
    let gotSeed = Math.random() < 0.7;
    let lastStrain = getLastHarvestedStrain();
    let doubleBonus = false;
    let bonusSeeds = 1;
    if (gotSeed) {
        if (lastStrain && lastStrain === plant.seedType) {
            bonusSeeds = 2;
            doubleBonus = true;
        }
    }
    // Always update last harvested strain
    setLastHarvestedStrain(plant.seedType);
    // Now, call the original showHarvestResults with a patch for seed awarding
    let patch = {
        gotSeed,
        bonusSeeds,
        doubleBonus
    };
    oldShowHarvestResultsDouble._patch = patch;
    oldShowHarvestResultsDouble.apply(this, arguments);
    oldShowHarvestResultsDouble._patch = null;
};
// Patch the seed awarding logic in the original showHarvestResults
const oldShowHarvestResults3b = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    let patch = oldShowHarvestResults3b._patch;
    const resultsDiv = document.getElementById('harvestResults');
    if (!resultsDiv) return;
    document.getElementById('finalStrainName').textContent = seedProperties[plant.seedType].name;
    document.getElementById('finalWeight').textContent = `${finalWeight}g`;
    document.getElementById('finalPotency').textContent = `${finalPotency}%`;
    let seedBankDiv = document.getElementById('seedBankDisplay');
    let finalPlantImage = document.getElementById('finalPlantImage');
    if (patch && patch.gotSeed) {
        // 25% chance of random pollination from a different seed type
        let pollinatedType = plant.seedType;
        if (Math.random() < 0.25) {
            const otherTypes = Object.keys(seedProperties).filter(type => type !== plant.seedType);
            pollinatedType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }
        setLivesForPlayer(getLivesForPlayer() + patch.bonusSeeds);
        saveHighScores();
        updateHighScoresDisplay();
        let pollMsg = pollinatedType === plant.seedType
            ? `+${patch.bonusSeeds} Seed${patch.bonusSeeds > 1 ? 's' : ''}!<br><span style='color:#bfcfff;font-size:0.8em;'>Total: ${getLivesForPlayer()}</span>`
            : `+${patch.bonusSeeds} Seed${patch.bonusSeeds > 1 ? 's' : ''}!<br><span style='color:#bfcfff;font-size:0.8em;'>Pollinated by ${seedProperties[pollinatedType].name}!<br>Total: ${getLivesForPlayer()}</span>`;
        if (patch.doubleBonus) {
            pollMsg = `<span style='color:#ffd700;'>Double! </span>` + pollMsg;
        }
        seedBankDiv.innerHTML = `<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:10px;'>
            <div style='font-size:1em;color:#ffd700;font-family:"Press Start 2P",monospace;'>${pollMsg}</div>
        </div>`;
        if (finalPlantImage) {
            finalPlantImage.src = `img/selections/${seedProperties[pollinatedType].image}`;
            finalPlantImage.alt = `${seedProperties[pollinatedType].name} Seed`;
            finalPlantImage.style.width = '86px';
            finalPlantImage.style.height = '86px';
            finalPlantImage.style.objectFit = 'cover';
            finalPlantImage.style.borderRadius = '8px';
            finalPlantImage.style.border = '2px solid #bfcfff';
            finalPlantImage.style.boxShadow = '0 2px 8px #000a';
            finalPlantImage.style.display = 'block';
            finalPlantImage.style.margin = '1.5rem auto';
        }
        plant.scoresRecorded = true;
    } else {
        seedBankDiv.innerHTML = '';
        if (finalPlantImage) {
            finalPlantImage.src = 'img/stages/yield.png';
            finalPlantImage.alt = 'Harvested Yield';
            finalPlantImage.style.width = '200px';
            finalPlantImage.style.height = '200px';
            finalPlantImage.style.objectFit = 'cover';
            finalPlantImage.style.borderRadius = '8px';
            finalPlantImage.style.border = '2px solid #bfcfff';
            finalPlantImage.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.3)';
            finalPlantImage.style.display = 'block';
            finalPlantImage.style.margin = '1.5rem auto';
        }
        if (!plant.scoresRecorded && finalPotency !== null && finalWeight !== null && plant.frozenStats) {
            addScore('potency', finalPotency);
            addScore('yield', finalWeight);
            plant.scoresRecorded = true;
        }
    }
    updateHighScoresDisplay();
    resultsDiv.classList.remove('hidden');
    updateSeedBankSelectionDisplay();
};
// ... existing code ...

// ... existing code ...
function resetSelectionScreen() {
    // Refund a life if a seed was selected but the game was not started
    if (typeof lastSelectedSeed !== 'undefined' && lastSelectedSeed) {
        // Only refund if the player actually lost a life for this selection
        if (plant.seedType) {
            setLivesForPlayer(getLivesForPlayer() + 1);
            updateHighScoresDisplay();
        }
    }
    // Unselect all seed and soil options
    document.querySelectorAll('.seed-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.soil-option').forEach(opt => opt.classList.remove('selected'));
    // Reset plant state
    plant.seedType = null;
    plant.soilType = null;
    // Disable start button
    const startButton = document.getElementById('startGameBtn');
    if (startButton) startButton.disabled = true;
    // Reset lastSelectedSeed for lives logic
    if (typeof lastSelectedSeed !== 'undefined') lastSelectedSeed = null;
}
// Call resetSelectionScreen whenever the selection screen is shown for a new game
// After a game ends and before showing the selection screen
const oldNewGameBtnHandler = document.addEventListener;
document.addEventListener = function(type, handler, ...args) {
    if (type === 'DOMContentLoaded') {
        handler = function(e) {
            // Patch new game button
            const newGameBtn = document.getElementById('newGameBtn');
            if (newGameBtn) {
                newGameBtn.addEventListener('click', function() {
                    resetSelectionScreen();
                });
            }
            return arguments.callee.orig.apply(this, arguments);
        };
        handler.orig = arguments[1];
    }
    return oldNewGameBtnHandler.apply(this, [type, handler, ...args]);
};
// Also call resetSelectionScreen in initializeNameInput after showing the selection screen
// ... existing code ...

// Patch showHarvestResults to support Look for Seeds button
const oldShowHarvestResultsLookForSeeds = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    oldShowHarvestResultsLookForSeeds.apply(this, arguments);
    // After showing results, set up Look for Seeds logic
    const lookBtn = document.getElementById('lookForSeedsBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const msgDiv = document.getElementById('lookForSeedsMsg');
    const finalPlantImage = document.getElementById('finalPlantImage');
    // --- FLEX CONTAINER LOGIC ---
    let flexContainer = document.getElementById('harvestImageFlex');
    if (!flexContainer) {
        flexContainer = document.createElement('div');
        flexContainer.id = 'harvestImageFlex';
        flexContainer.style.display = 'flex';
        flexContainer.style.flexDirection = 'row';
        flexContainer.style.justifyContent = 'center';
        flexContainer.style.alignItems = 'center';
        flexContainer.style.margin = '1.5rem 0';
        // Insert before the lookForSeedsMsg
        const parent = finalPlantImage.parentNode;
        parent.insertBefore(flexContainer, finalPlantImage);
    }
    // Remove any children from flexContainer
    while (flexContainer.firstChild) flexContainer.removeChild(flexContainer.firstChild);
    // Remove the original finalPlantImage from DOM if present
    if (finalPlantImage.parentNode === flexContainer) {
        flexContainer.removeChild(finalPlantImage);
    }
    // Always add the bag image to the flex container
    finalPlantImage.src = 'img/stages/yield.png';
    finalPlantImage.alt = 'Harvested Yield';
    finalPlantImage.style.width = '200px';
    finalPlantImage.style.height = '200px';
    finalPlantImage.style.objectFit = 'cover';
    finalPlantImage.style.borderRadius = '8px';
    finalPlantImage.style.border = '2px solid #bfcfff';
    finalPlantImage.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.3)';
    finalPlantImage.style.display = 'block';
    finalPlantImage.style.margin = '0 12px 0 0';
    finalPlantImage.style.verticalAlign = 'middle';
    flexContainer.appendChild(finalPlantImage);
    // Remove any previous seed image
    let existingSeedImg = document.getElementById('foundSeedImage');
    if (existingSeedImg && existingSeedImg.parentNode) {
        existingSeedImg.parentNode.removeChild(existingSeedImg);
    }
    if (lookBtn && newGameBtn) {
        lookBtn.disabled = false;
        newGameBtn.disabled = true;
        msgDiv.textContent = '';
        lookBtn.style.opacity = 1;
        lookBtn.onclick = function() {
            lookBtn.disabled = true;
            lookBtn.style.opacity = 0.5;
            // Remove any previous seed image
            let prevSeedImg = document.getElementById('foundSeedImage');
            if (prevSeedImg && prevSeedImg.parentNode) {
                prevSeedImg.parentNode.removeChild(prevSeedImg);
            }
            // 15% chance to get a seed
            if (Math.random() < 0.95) {
                setLivesForPlayer(getLivesForPlayer() + 1);
                saveHighScores();
                updateHighScoresDisplay();
                msgDiv.textContent = 'You found a seed! +1 Seed';
                // Show the bag image and the seed image side by side
                if (plant.seedType && seedProperties[plant.seedType]) {
                    // Create the seed image
                    let seedImg = document.createElement('img');
                    seedImg.id = 'foundSeedImage';
                    seedImg.src = `img/selections/${seedProperties[plant.seedType].image}`;
                    seedImg.alt = `${seedProperties[plant.seedType].name} Seed`;
                    seedImg.style.width = '200px';
                    seedImg.style.height = '200px';
                    seedImg.style.objectFit = 'cover';
                    seedImg.style.borderRadius = '8px';
                    seedImg.style.border = '2px solid #ffd700';
                    seedImg.style.boxShadow = '0 2px 8px #000a';
                    seedImg.style.display = 'block';
                    seedImg.style.margin = '0 0 0 12px';
                    seedImg.style.verticalAlign = 'middle';
                    flexContainer.appendChild(seedImg);
                }
            } else {
                msgDiv.textContent = 'No seeds found this time.';
                // Only show the bag image
                // (already present in flexContainer)
            }
            newGameBtn.disabled = false;
        };
    }
};

// Add defense selection logic
plant.defenseType = null;

// Attach defense selection handlers
var defenseOptions = document.querySelectorAll('.defense-option');
defenseOptions.forEach(function(option) {
    option.addEventListener('click', function() {
        // Remove selected class from all defense options
        defenseOptions.forEach(function(opt) {
            opt.classList.remove('selected');
        });
        // Add selected class to clicked option
        option.classList.add('selected');
        // Store selected defense type
        plant.defenseType = option.getAttribute('data-defense-type');
        updateStartButton();
    });
});

// Update start button state to require defense selection
function updateStartButton() {
    startButton.disabled = !(plant.seedType && plant.soilType && plant.defenseType);
}

// --- Defense Effects ---
// Patch pest and raider event logic to check defense
function showPestEvent() {
    pestActive = true;
    const pestType = pestTypes[Math.floor(Math.random() * pestTypes.length)];
    addEventToLog(`${pestType.message}`, 'warning');
    // If Grower defense, block pest penalty
    if (plant.defenseType === 'grower') {
        setTimeout(function() {
            addEventToLog('Your Grower defended against the pests!', 'info');
            pestActive = false;
        }, 2000);
        return;
    }
    // Random chance to successfully defend against pests
    const defenseSuccess = Math.random() < pestType.successRate;
    setTimeout(function() {
        if (defenseSuccess) {
            addEventToLog(`${pestType.name} were successfully repelled!`, 'info');
        } else {
            const damagePercent = Math.floor(Math.random() * (pestType.damage[1] - pestType.damage[0])) + pestType.damage[0];
            plant.pestPenalty *= (1 - (damagePercent / 100));
            addEventToLog(`${pestType.name} reduced potency by ${damagePercent}%.`, 'error');
        }
        pestActive = false;
    }, 10000);
}

function showRaiderEvent() {
    raiderActive = true;
    const raidType = raidTypes[Math.floor(Math.random() * raidTypes.length)];
    addEventToLog(`${raidType.message}`, 'warning');
    // If Hound defense, block raider penalty
    if (plant.defenseType === 'hound') {
        setTimeout(function() {
            addEventToLog('Your Hound chased off the raiders!', 'info');
            raiderActive = false;
        }, 2000);
        return;
    }
    // Random chance to successfully defend against raiders
    const defenseSuccess = Math.random() < raidType.successRate;
    setTimeout(function() {
        if (defenseSuccess) {
            addEventToLog(`${raidType.name} were successfully repelled!`, 'info');
        } else {
            const damagePercent = Math.floor(Math.random() * (raidType.damage[1] - raidType.damage[0])) + raidType.damage[0];
            plant.raiderPenalty *= (1 - (damagePercent / 100));
            addEventToLog(`${raidType.name} reduced yield by ${damagePercent}%.`, 'error');
        }
        raiderActive = false;
    }, 10000);
}

// --- MarrowCorp Seed Theft ---
function marrowCorpSeedTheft() {
    // Only trigger if not protected by Vault
    if (plant.defenseType === 'vault') return;
    if (Math.random() < 0.25 && getLivesForPlayer() > 0) {
        setLivesForPlayer(getLivesForPlayer() - 1);
        saveHighScores();
        updateHighScoresDisplay();
        // Show message to player
        setTimeout(function() {
            alert('MarrowCorp agents have stolen 1 of your seeds!');
        }, 500);
    }
}
// Call marrowCorpSeedTheft after each grow (after showHarvestResults)
const oldShowHarvestResults_MarrowCorp = showHarvestResults;
showHarvestResults = function(finalPotency, finalWeight) {
    oldShowHarvestResults_MarrowCorp.apply(this, arguments);
    marrowCorpSeedTheft();
};
// ... existing code ...

// --- Game Live State Helper ---
function isGameLive() {
    // If plant.growthTimer is set, or gameSection is visible
    const gameSection = document.getElementById('gameSection');
    return (plant.growthTimer !== null) || (gameSection && !gameSection.classList.contains('hidden'));
}