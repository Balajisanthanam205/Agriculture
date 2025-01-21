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

    // Send pump control data back to ESP32
    if (pumpStatus) {
      fetch('http://[ESP32_IP_ADDRESS]/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pumpStatus: pumpStatus,
          duration: irrigationDuration
        })
      }).catch(error => console.error('Error:', error));
    }
  }

  // Fetch real data from ESP32
  async function fetchMoistureData() {
    try {
      const response = await fetch('http://[ESP32_IP_ADDRESS]/moisture');
      const data = await response.json();
      moistureData = data;
      updateMoistureBars();
      calculateIrrigation();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Initial setup
  setGrowthStage(1);
  // Fetch data every 5 seconds
  setInterval(fetchMoistureData, 5000);
  fetchMoistureData();
});