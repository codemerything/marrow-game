// View Service for handling all UI updates
const ViewService = {
    // High Scores Display
    updateHighScoresDisplay(highScores, currentGrower) {
        this.updatePotencyScores(highScores);
        this.updateYieldScores(highScores);
        this.updateAveragePotencyScores(highScores);
        this.updateSeedBankDisplay(highScores, currentGrower);
    },

    updatePotencyScores(highScores) {
        const potencyScores = document.getElementById('potencyScores');
        if (!potencyScores) return;

        let allPotencyScores = [];
        Object.entries(highScores.potencyHistory).forEach(([name, arr]) => {
            arr.forEach(score => allPotencyScores.push({ name, score }));
        });
        allPotencyScores.sort((a, b) => b.score - a.score);
        
        potencyScores.innerHTML = allPotencyScores.slice(0, 3).map((score, index) => `
            <div class="score-entry">
                ${index + 1}. ${score.name}: ${score.score}%
            </div>
        `).join('');
    },

    updateYieldScores(highScores) {
        const yieldScores = document.getElementById('yieldScores');
        if (!yieldScores) return;

        let yieldArr = Object.entries(highScores.totalYield)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        yieldScores.innerHTML = yieldArr.slice(0, 5).map((entry, index) => `
            <div class="score-entry">
                ${index + 1}. ${entry.name}: ${entry.total}g
            </div>
        `).join('');
    },

    updateAveragePotencyScores(highScores) {
        const avgPotencyScores = document.getElementById('averagePotencyScores');
        if (!avgPotencyScores) return;

        let avgPotencyArr = Object.entries(highScores.potencyHistory)
            .map(([name, arr]) => ({
                name,
                avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
                count: arr.length
            }))
            .sort((a, b) => b.avg - a.avg);

        avgPotencyScores.innerHTML = avgPotencyArr.slice(0, 3).map((entry, index) => `
            <div class="score-entry">
                ${index + 1}. ${entry.name}: ${entry.avg}% (${entry.count} grows)
            </div>
        `).join('');
    },

    updateSeedBankDisplay(highScores, currentGrower) {
        const seedBankScores = document.getElementById('seedBankScores');
        if (!seedBankScores) return;

        let seedBankHTML = '';
        if (currentGrower && highScores.seedLives && typeof highScores.seedLives[currentGrower] === 'number') {
            seedBankHTML = `<div class='score-entry' style='font-size:1.1em;color:#ffd700;'>Seeds: <span style='color:#fff;'>${highScores.seedLives[currentGrower]}</span></div>`;
        } else {
            seedBankHTML = `<div class='score-entry' style='color:#bfcfff;'>Seeds: 0</div>`;
        }
        seedBankScores.innerHTML = seedBankHTML;
    },

    // Plant Status Display
    updatePlantStatus(plant) {
        const statusDisplay = document.getElementById('plantStatus');
        if (!statusDisplay) return;

        const status = this.getPlantStatus(plant);
        statusDisplay.innerHTML = status.map(item => `
            <div class="status-item ${item.class}">
                <span class="status-label">${item.label}:</span>
                <span class="status-value">${item.value}</span>
            </div>
        `).join('');
    },

    getPlantStatus(plant) {
        return [
            { label: 'Health', value: `${plant.health}%`, class: this.getHealthClass(plant.health) },
            { label: 'Growth', value: `${plant.growth}%`, class: 'status-normal' },
            { label: 'Stress', value: `${plant.stress}%`, class: this.getStressClass(plant.stress) }
        ];
    },

    getHealthClass(health) {
        if (health >= 80) return 'status-good';
        if (health >= 50) return 'status-warning';
        return 'status-danger';
    },

    getStressClass(stress) {
        if (stress <= 20) return 'status-good';
        if (stress <= 50) return 'status-warning';
        return 'status-danger';
    },

    // Resource Display
    updateResourceDisplay(resources) {
        this.updateElement('waterLevel', resources.water);
        this.updateElement('lightLevel', resources.light);
        this.updateElement('nutrientLevel', resources.nutrients);
        this.updateElement('stressLevel', resources.stress);
    },

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewService;
} 