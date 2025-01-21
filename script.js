const esp32IP = "http://192.168.225.16"; // ESP32 IP address

function fetchSensorData() {
  fetch(`${esp32IP}/`)
    .then(response => response.json())
    .then(data => {
      updateUI(data);
    })
    .catch(error => {
      console.error("Error fetching data:", error);
      document.getElementById("recommendation").textContent = "Error fetching data. Please check the ESP32 connection.";
    });
}

function updateUI(data) {
  document.getElementById("moisture1").textContent = data.moisture1;
  document.getElementById("moisture2").textContent = data.moisture2;
  document.getElementById("moisture3").textContent = data.moisture3;

  let avgMoisture = (data.moisture1 + data.moisture2 + data.moisture3) / 3;
  let pumpDuration = 0;

  if (avgMoisture < 30) {
    pumpDuration = 30; // 30 minutes
  } else if (avgMoisture < 50) {
    pumpDuration = 15; // 15 minutes
  } else {
    pumpDuration = 0; // No need to run the pump
  }

  document.getElementById("recommendation").textContent = 
    pumpDuration > 0 
    ? `Switch on the pump for ${pumpDuration} minutes.` 
    : "No need to switch on the pump.";
}

// Fetch data every 5 seconds
setInterval(fetchSensorData, 5000);

// Initial fetch
fetchSensorData();
