document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // State
  let growthStage = 1;
  let moistureData = {
    depth1ft: 0,
    depth2ft: 0,
    depth3ft: 0
  };
  let pumpStatus = false;
  let irrigationDuration = 0;

  // DOM Elements
  const stageButtons = document.querySelectorAll('.stage-btn');
  const moistureCards = document.querySelectorAll('.moisture-grid .card');
  const pumpStatusElement = document.querySelector('.pump-status');
  const durationElement = document.querySelector('.duration');

  // Event Listeners
  stageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const stage = parseInt(button.dataset.stage);
      setGrowthStage(stage);
    });
  });

  // Functions
  function setGrowthStage(stage) {
    growthStage = stage;
    
    // Update button states
    stageButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.stage) === stage);
    });

    // Update sensor card visibility
    moistureCards.forEach((card, index) => {
      card.classList.toggle('opacity-50', index + 1 > stage);
    });

    // Recalculate irrigation
    calculateIrrigation();
  }

  function updateMoistureBars() {
    Object.entries(moistureData).forEach(([key, value], index) => {
      const card = moistureCards[index];
      const bar = card.querySelector('.moisture-bar');
      const valueElement = card.querySelector('.moisture-value');

      bar.style.width = `${value}%`;
      bar.classList.toggle('low', value < 30);
      valueElement.textContent = `${value}% Moisture`;
    });
  }

  function calculateIrrigation() {
    let averageMoisture = 0;
    let sensorCount = 0;

    if (growthStage >= 1) {
      averageMoisture += moistureData.depth1ft;
      sensorCount++;
    }
    if (growthStage >= 2) {
      averageMoisture += moistureData.depth2ft;
      sensorCount++;
    }
    if (growthStage >= 3) {
      averageMoisture += moistureData.depth3ft;
      sensorCount++;
    }

    averageMoisture /= sensorCount || 1;

    if (averageMoisture < 30) {
      irrigationDuration = Math.round((30 - averageMoisture) * 2);
      pumpStatus = true;
    } else {
      irrigationDuration = 0;
      pumpStatus = false;
    }

    // Update UI
    pumpStatusElement.textContent = pumpStatus ? 'ON' : 'OFF';
    pumpStatusElement.classList.toggle('on', pumpStatus);
    pumpStatusElement.classList.toggle('off', !pumpStatus);
    durationElement.textContent = `${irrigationDuration} minutes`;
  }

  // Simulate data updates (replace with actual ESP32 data)
  function simulateDataUpdates() {
    moistureData = {
      depth1ft: Math.floor(Math.random() * 100),
      depth2ft: Math.floor(Math.random() * 100),
      depth3ft: Math.floor(Math.random() * 100)
    };

    updateMoistureBars();
    calculateIrrigation();
  }

  // Initial setup
  setGrowthStage(1);
  setInterval(simulateDataUpdates, 5000);
  simulateDataUpdates();
});