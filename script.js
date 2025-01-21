// Configuration
const MOISTURE_THRESHOLDS = {
  LOW: 30,
  OPTIMAL: 60,
  HIGH: 80
};

const PUMP_DURATION_MULTIPLIER = 2; // minutes per percentage point needed
const ESP32_WEBSOCKET_URL = 'ws://192.168.225.16:81'; // Update with your ESP32's IP address

// State management
let currentData = {
  sensor1: null,
  sensor2: null,
  sensor3: null,
  growthStage: 1,
  irrigationInProgress: false,
  irrigationTimeRemaining: 0
};

// DOM Elements
const growthStageSelect = document.getElementById('growthStage');
const startIrrigationBtn = document.getElementById('startIrrigation');
const irrigationStatus = document.getElementById('irrigationStatus');
const pumpDuration = document.getElementById('pumpDuration');
const activityLog = document.getElementById('activityLog');
const modal = document.getElementById('irrigationModal');
const modalMessage = document.getElementById('modalMessage');
const timeRemaining = document.getElementById('timeRemaining');
const progressBar = document.querySelector('.progress');

// Event Listeners
growthStageSelect.addEventListener('change', (e) => {
  currentData.growthStage = parseInt(e.target.value);
  updateActiveSensors();
  updateIrrigationRecommendation();
});

startIrrigationBtn.addEventListener('click', startIrrigation);

// WebSocket connection to ESP32
function initializeWebSocket() {
  const ws = new WebSocket(ESP32_WEBSOCKET_URL);
  
  ws.onopen = () => {
      addToActivityLog('Connected to ESP32');
      updateConnectionStatus(true);
  };
  
  ws.onmessage = (event) => {
      try {
          const data = JSON.parse(event.data);
          updateSensorData(data);
      } catch (error) {
          console.error('Error parsing sensor data:', error);
      }
  };
  
  ws.onclose = () => {
      addToActivityLog('Connection lost. Attempting to reconnect...');
      updateConnectionStatus(false);
      setTimeout(initializeWebSocket, 5000);
  };
  
  ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addToActivityLog('Connection error');
  };
}

// Update connection status in UI
function updateConnectionStatus(connected) {
  const statusDots = document.querySelectorAll('.status-dot');
  statusDots.forEach(dot => {
      dot.style.background = connected ? 'var(--primary-color)' : 'var(--danger-color)';
      dot.style.boxShadow = `0 0 10px ${connected ? 'var(--primary-color)' : 'var(--danger-color)'}`;
  });
}

// Update active sensors based on growth stage
function updateActiveSensors() {
  const sensorCards = document.querySelectorAll('.sensor-card');
  const stage = currentData.growthStage;
  
  sensorCards.forEach((card, index) => {
      if (index < stage) {
          card.classList.add('active');
      } else {
          card.classList.remove('active');
      }
  });
}

// Update sensor displays with real data
function updateSensorData(data) {
  currentData = { ...currentData, ...data };
  
  Object.keys(data).forEach(sensorId => {
      const value = data[sensorId];
      if (value !== null) {
          const sensorCard = document.getElementById(sensorId);
          if (sensorCard) {
              const gaugeFill = sensorCard.querySelector('.gauge-fill');
              const valueDisplay = sensorCard.querySelector('.moisture-value');
              const statusText = sensorCard.querySelector('.status-text');
              
              gaugeFill.style.height = `${value}%`;
              valueDisplay.textContent = `${value}`;
              statusText.textContent = getMoistureStatus(value);
              
              updateGaugeColors(gaugeFill, value);
          }
      }
  });
  
  updateIrrigationRecommendation();
}

// Update gauge colors with gradient effect
function updateGaugeColors(gaugeElement, value) {
  if (value < MOISTURE_THRESHOLDS.LOW) {
      gaugeElement.style.background = 'linear-gradient(to top, var(--danger-color), #ff8888)';
  } else if (value > MOISTURE_THRESHOLDS.HIGH) {
      gaugeElement.style.background = 'linear-gradient(to top, var(--primary-color), var(--secondary-color))';
  } else if (value >= MOISTURE_THRESHOLDS.OPTIMAL) {
      gaugeElement.style.background = 'linear-gradient(to top, var(--secondary-color), #80dfff)';
  } else {
      gaugeElement.style.background = 'linear-gradient(to top, var(--warning-color), #ffdb4d)';
  }
}

// Get moisture status text
function getMoistureStatus(value) {
  if (value < MOISTURE_THRESHOLDS.LOW) return 'Too Dry';
  if (value > MOISTURE_THRESHOLDS.HIGH) return 'Too Wet';
  if (value >= MOISTURE_THRESHOLDS.OPTIMAL) return 'Optimal';
  return 'Adequate';
}

// Calculate average moisture based on growth stage
function calculateAverageMoisture() {
  let sum = currentData.sensor1 || 0;
  let count = 1;
  
  if (currentData.growthStage >= 2 && currentData.sensor2 !== null) {
      sum += currentData.sensor2;
      count++;
  }
  
  if (currentData.growthStage >= 3 && currentData.sensor3 !== null) {
      sum += currentData.sensor3;
      count++;
  }
  
  return sum / count;
}

// Update irrigation recommendation
function updateIrrigationRecommendation() {
  const averageMoisture = calculateAverageMoisture();
  const statusIcon = document.querySelector('.status-icon');
  
  if (averageMoisture < MOISTURE_THRESHOLDS.LOW) {
      irrigationStatus.textContent = 'Irrigation Required';
      statusIcon.style.background = 'var(--danger-color)';
      statusIcon.style.boxShadow = '0 0 20px var(--danger-color)';
      startIrrigationBtn.disabled = false;
      
      const moistureNeeded = MOISTURE_THRESHOLDS.OPTIMAL - averageMoisture;
      const duration = Math.ceil(moistureNeeded * PUMP_DURATION_MULTIPLIER);
      pumpDuration.textContent = `${duration} minutes`;
  } else if (averageMoisture > MOISTURE_THRESHOLDS.HIGH) {
      irrigationStatus.textContent = 'Soil Too Wet - No Irrigation Needed';
      statusIcon.style.background = 'var(--primary-color)';
      statusIcon.style.boxShadow = '0 0 20px var(--primary-color)';
      startIrrigationBtn.disabled = true;
      pumpDuration.textContent = 'Not needed';
  } else {
      irrigationStatus.textContent = 'Soil Moisture Adequate';
      statusIcon.style.background = 'var(--secondary-color)';
      statusIcon.style.boxShadow = '0 0 20px var(--secondary-color)';
      startIrrigationBtn.disabled = true;
      pumpDuration.textContent = 'Not needed';
  }
}

// Format time remaining
function formatTimeRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Start irrigation
function startIrrigation() {
  const duration = parseInt(pumpDuration.textContent);
  if (isNaN(duration)) return;

  startIrrigationBtn.disabled = true;
  currentData.irrigationInProgress = true;
  currentData.irrigationTimeRemaining = duration * 60; // Convert to seconds

  // Show modal
  modal.style.display = 'block';
  modalMessage.textContent = `Starting irrigation for ${duration} minutes`;
  updateIrrigationProgress();

  // Send irrigation command to ESP32
  const ws = new WebSocket(ESP32_WEBSOCKET_URL);
  ws.onopen = () => {
      ws.send(JSON.stringify({
          command: 'startIrrigation',
          duration: duration
      }));
      addToActivityLog(`Started irrigation for ${duration} minutes`);
  };
}

// Update irrigation progress
function updateIrrigationProgress() {
  const totalSeconds = parseInt(pumpDuration.textContent) * 60;
  const updateInterval = setInterval(() => {
      if (currentData.irrigationTimeRemaining <= 0) {
          clearInterval(updateInterval);
          modal.style.display = 'none';
          currentData.irrigationInProgress = false;
          addToActivityLog('Irrigation completed');
          return;
      }

      currentData.irrigationTimeRemaining--;
      const progress = ((totalSeconds - currentData.irrigationTimeRemaining) / totalSeconds) * 100;
      progressBar.style.width = `${progress}%`;
      timeRemaining.textContent = formatTimeRemaining(currentData.irrigationTimeRemaining);
  }, 1000);
}

// Add entry to activity log
function addToActivityLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = 'activity-item';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'activity-time';
  timeSpan.textContent = timestamp;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  
  logEntry.appendChild(timeSpan);
  logEntry.appendChild(messageSpan);
  
  activityLog.insertBefore(logEntry, activityLog.firstChild);
}

// Initialize the application
function initialize() {
  initializeWebSocket();
  updateActiveSensors();
  updateIrrigationRecommendation();
  addToActivityLog('System initialized and ready');
}

// Start the application
initialize();