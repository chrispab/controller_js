import { useState, useEffect } from 'react';
import { execSync } from 'child_process';

function StatusBootstrapPage({ initialStatus }) {
  const [data, setData] = useState(initialStatus);
  const [lastPageUpdate, setLastPageUpdate] = useState(null); // Initialize as null
  const [mounted, setMounted] = useState(false); // State to track if component is mounted
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showNightSettings, setShowNightSettings] = useState(false);
  const [showFanSettings, setShowFanSettings] = useState(false);

  useEffect(() => {
    setMounted(true); // Set mounted to true after initial render on client

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // WebSocket for real-time updates
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:5678',
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        if (typeof receivedData === 'object' && receivedData !== null) {
          setData((prevData) => ({
            ...prevData,
            ...receivedData,
          }));
          setLastPageUpdate(new Date()); // Update timestamp only on client
        } else {
          console.log('Received non-JSON WebSocket message:', event.data);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', event.data, e);
        console.log('Plain text WebSocket message:', event.data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      clearInterval(timer);
      ws.close();
    };
  }, []);

  const renderIndicator = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-muted">Loading...</span>;
    }
    return value ? (
      <span className="badge bg-success">On</span>
    ) : (
      <span className="badge bg-danger">Off</span>
    );
  };

  const renderVentTotal = (ventPower, ventSpeed) => {
    if (
      ventPower === null ||
      ventPower === undefined ||
      ventSpeed === null ||
      ventSpeed === undefined
    ) {
      return <span className="text-muted">Loading...</span>;
    }
    if (ventPower === 0) {
      return '0%';
    } else if (ventPower === 1 && ventSpeed === 0) {
      return '50%';
    } else if (ventPower === 1 && ventSpeed === 1) {
      return '100%';
    }
    return 'N/A'; // Fallback for unexpected values
  };

  const renderSoilMoisture = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-muted">Loading...</span>;
    }
    const badgeColor = value >= 30 ? 'bg-success' : 'bg-danger';
    return <span className={`badge ${badgeColor}`}>{value.toFixed(1)} %</span>;
  };
  const handleVentOnDurationChange = async (event, period) => {
    const value = event.target.value;
    setData((prevData) => ({
      ...prevData,
      [`ventOnDuration${period === 'day' ? 'Day' : 'Night'}Secs`]: value,
    }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/vent/onDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value, period }),
        },
      );
    } catch (error) {
      console.error(`Failed to set ventOnDuration for ${period}:`, error);
    }
  };

  const handleVentOffDurationChange = async (event, period) => {
    const value = event.target.value;
    setData((prevData) => ({
      ...prevData,
      [`ventOffDuration${period === 'day' ? 'Day' : 'Night'}Secs`]: value,
    }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/vent/offDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value, period }),
        },
      );
    } catch (error) {
      console.error(`Failed to set ventOffDuration for ${period}:`, error);
    }
  };

  const handleFanOnDurationChange = async (event) => {
    const value = event.target.value;
    setData((prevData) => ({ ...prevData, fanOnDurationSecs: value }));
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + `/api/fan/onDurationSecs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error(`Failed to set fanOnDurationSecs:`, error);
    }
  };

  const handleFanOffDurationChange = async (event) => {
    const value = event.target.value;
    setData((prevData) => ({ ...prevData, fanOffDurationSecs: value }));
    try {
      await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/api/fan/offDurationSecs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        },
      );
    } catch (error) {
      console.error(`Failed to set fanOffDurationSecs:`, error);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleDaySettings = () => setShowDaySettings(!showDaySettings);
  const toggleNightSettings = () => setShowNightSettings(!showNightSettings);
  const toggleFanSettings = () => setShowFanSettings(!showFanSettings);

  return (
    <div
      className={
        isDarkMode
          ? 'bg-dark text-light min-vh-100 py-3'
          : 'bg-light text-dark min-vh-100 py-3'
      }
    >
      <div className="container">
        <h1 className="text-center my-4">
          {data.zoneName} Greenhouse Control Dashboard
        </h1>
        <div className="form-check form-switch d-flex justify-content-center align-items-center mb-4">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="darkModeSwitch"
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <label className="form-check-label ms-2" htmlFor="darkModeSwitch">
            Toggle Dark Mode
          </label>
        </div>
        {!data ? (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '100px' }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row">
            {/* Environmental Readings */}
            <div className="col-md-6">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">Environmental Readings</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Temperature:
                      <span>
                        {typeof data.temperature === 'number'
                          ? `${data.temperature.toFixed(1)} °C`
                          : 'N/A'}
                      </span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Humidity:
                      <span>
                        {typeof data.humidity === 'number'
                          ? `${data.humidity.toFixed(1)} %`
                          : 'N/A'}
                      </span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Outside Temperature:
                      <span>
                        {typeof data.outsideTemperature === 'number'
                          ? `${data.outsideTemperature.toFixed(1)} °C`
                          : 'N/A'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Device Status */}
            <div className="col-md-6">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">Device Status</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Light:
                      <span>{renderIndicator(data.light)}</span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Heater:
                      <span>{renderIndicator(data.heater)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Air Control Card */}
            <div className="col-md-6 mx-auto">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">Air Control</div>
                <div className="card-body">
                  {/* <p>This is a new card for Air Control.</p> */}
                  <div
                    className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                  >
                    <div className="card-header">
                      Vent: {renderIndicator(data.ventPower)}
                    </div>
                    <div className="card-body">
                      <ul className="list-group list-group-flush">
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          Vent Speed:
                          <span>{data.ventSpeed ? 'High' : 'Low'}</span>
                        </li>
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          Vent Total:
                          <span>
                            {renderVentTotal(data.ventPower, data.ventSpeed)}
                          </span>
                        </li>
                      </ul>
                      <div
                        className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                      >
                        <div
                          className="card-header"
                          onClick={toggleDaySettings}
                          style={{ cursor: 'pointer' }}
                        >
                          Day Settings {showDaySettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showDaySettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="ventOnDurationDaySecs"
                                  className="form-label"
                                >
                                  On Duration (Day, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOnDurationDaySecs"
                                  value={data.ventOnDurationDaySecs || 0}
                                  onChange={(e) =>
                                    handleVentOnDurationChange(e, 'day')
                                  }
                                />
                                <span>{data.ventOnDurationDaySecs || 0}</span>
                              </li>
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="ventOffDurationDaySecs"
                                  className="form-label"
                                >
                                  Off Duration (Day, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOffDurationDaySecs"
                                  value={data.ventOffDurationDaySecs || 0}
                                  onChange={(e) =>
                                    handleVentOffDurationChange(e, 'day')
                                  }
                                />
                                <span>{data.ventOffDurationDaySecs || 0}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                      >
                        <div
                          className="card-header"
                          onClick={toggleNightSettings}
                          style={{ cursor: 'pointer' }}
                        >
                          Night Settings {showNightSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showNightSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="ventOnDurationNightSecs"
                                  className="form-label"
                                >
                                  On Duration (Night, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOnDurationNightSecs"
                                  value={data.ventOnDurationNightSecs || 0}
                                  onChange={(e) =>
                                    handleVentOnDurationChange(e, 'night')
                                  }
                                />
                                <span>{data.ventOnDurationNightSecs || 0}</span>
                              </li>
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="ventOffDurationNightSecs"
                                  className="form-label"
                                >
                                  Off Duration (Night, secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="ventOffDurationNightSecs"
                                  value={data.ventOffDurationNightSecs || 0}
                                  onChange={(e) =>
                                    handleVentOffDurationChange(e, 'night')
                                  }
                                />
                                <span>
                                  {data.ventOffDurationNightSecs || 0}
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                  >
                    <div className="card-header">
                      Fan: {renderIndicator(data.fan)}
                    </div>
                    <div className="card-body">
                      <div
                        className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                      >
                        <div
                          className="card-header"
                          onClick={toggleFanSettings}
                          style={{ cursor: 'pointer' }}
                        >
                          Fan Settings {showFanSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showFanSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="fanOnDurationSecs"
                                  className="form-label"
                                >
                                  On Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOnDurationSecs"
                                  value={data.fanOnDurationSecs || 0}
                                  onChange={handleFanOnDurationChange}
                                />
                                <span>{data.fanOnDurationSecs || 0}</span>
                              </li>
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="fanOffDurationSecs"
                                  className="form-label"
                                >
                                  Off Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOffDurationSecs"
                                  value={data.fanOffDurationSecs || 0}
                                  onChange={handleFanOffDurationChange}
                                />
                                <span>{data.fanOffDurationSecs || 0}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Setpoint Control Card */}
            <div className="col-md-6 mx-auto">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">Setpoint Control</div>
                <div className="card-body">
                  <div
                    className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                  >
                    <div className="card-header">Setpoint: {data.setpoint}</div>
                    <div className="card-body">
                      <div
                        className={`card mt-3 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                      >
                        <div
                          className="card-header"
                          onClick={toggleFanSettings}
                          style={{ cursor: 'pointer' }}
                        >
                          Fan Settings {showFanSettings ? '▲' : '▼'}
                        </div>
                        <div
                          className={`collapse ${showFanSettings ? 'show' : ''}`}
                        >
                          <div className="card-body">
                            <ul className="list-group list-group-flush">
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="fanOnDurationSecs"
                                  className="form-label"
                                >
                                  On Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOnDurationSecs"
                                  value={data.fanOnDurationSecs || 0}
                                  onChange={handleFanOnDurationChange}
                                />
                                <span>{data.fanOnDurationSecs || 0}</span>
                              </li>
                              <li
                                className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                              >
                                <label
                                  htmlFor="fanOffDurationSecs"
                                  className="form-label"
                                >
                                  Off Duration (secs)
                                </label>
                                <input
                                  type="range"
                                  className="form-range"
                                  min="5"
                                  max="420"
                                  step="5"
                                  id="fanOffDurationSecs"
                                  value={data.fanOffDurationSecs || 0}
                                  onChange={handleFanOffDurationChange}
                                />
                                <span>{data.fanOffDurationSecs || 0}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Water Control */}
            <div className="col-md-6">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">Water Control</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Soil Moisture:
                      <span>
                        {renderSoilMoisture(data.soilMoisturePercent)}
                      </span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Irrigation Pump:
                      <span>{renderIndicator(data.irrigationPump)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="col-md-6 mx-auto">
              <div
                className={`card mb-4 ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
              >
                <div className="card-header">System Information</div>
                <div className="card-body">
                  <ul className="list-group list-group-flush">
                    {mounted && (
                      <>
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          WebSocket:
                          <span>{renderIndicator(isWsConnected)}</span>
                        </li>
                      </>
                    )}
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Version:
                      <span>{data.version}</span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Description:
                      <span className="text-end">{data.description}</span>
                    </li>
                    <li
                      className={`list-group-item ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Release Notes:
                      <span className="text-end">{data.releaseNotes}</span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Git Branch:
                      <span>{data.gitBranch}</span>
                    </li>
                    <li
                      className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                    >
                      Last Commit:
                      <span className="text-end">{data.gitCommit}</span>
                    </li>
                    {mounted && (
                      <>
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          Last Changed:
                          <span>
                            {data && data.timeStamp
                              ? new Date(data.timeStamp).toLocaleTimeString()
                              : ''}
                          </span>
                        </li>
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          Last Change:
                          <span>{data ? data.lastChange : ''}</span>
                        </li>
                        <li
                          className={`list-group-item d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-custom-card-dark text-white' : ''}`}
                        >
                          Current Time:
                          <span>{new Date().toLocaleTimeString()}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

//get initial data from controller api
export async function getServerSideProps() {
  let initialStatus = {};
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678'; // Fallback for development
  try {
    console.log(`Fetching status from: ${API_URL}/api/status`);
    const statusRes = await fetch(`${API_URL}/api/status`);
    console.log(`Status response status: ${statusRes.status}`);
    const statusData = await statusRes.json();
    initialStatus = statusData.message;

    // Fetch vent durations for day
    console.log(`Fetching vent on duration (day) from: ${API_URL}/api/vent/onDurationSecs?period=day`,);
    const ventOnDayRes = await fetch(`${API_URL}/api/vent/onDurationSecs?period=day`,);
    console.log( `vent on duration (day) from response status: ${ventOnDayRes.status}`, );
    const ventOnDayData = await ventOnDayRes.json();
    console.log( `vent on duration (day) from response ventOnDayData: ${JSON.stringify(ventOnDayData)}`, );
    initialStatus.ventOnDurationDaySecs = ventOnDayData.day; // Assuming the API returns { day: value, night: value }

    console.log(`Fetching vent off duration (day) from: ${API_URL}/api/vent/offDurationSecs?period=day`, );
    const ventOffDayRes = await fetch(`${API_URL}/api/vent/offDurationSecs?period=day`, );
    console.log( `vent off duration (day) response status: ${ventOffDayRes.status}`, );
    const ventOffDayData = await ventOffDayRes.json();
    initialStatus.ventOffDurationDaySecs = ventOffDayData.day; // Assuming the API returns { day: value, night: value }

    // Fetch vent durations for night
    console.log(`Fetching vent on duration (night) from: ${API_URL}/api/vent/onDurationSecs?period=night`, );
    const ventOnNightRes = await fetch( `${API_URL}/api/vent/onDurationSecs?period=night`, );
    console.log( `vent on duration (night) response status: ${ventOnNightRes.status}`, );
    const ventOnNightData = await ventOnNightRes.json();
    initialStatus.ventOnDurationNightSecs = ventOnNightData.night; // Assuming the API returns { day: value, night: value }

    console.log(`Fetching vent off duration (night) from: ${API_URL}/api/vent/offDurationSecs?period=night`, );
    const ventOffNightRes = await fetch( `${API_URL}/api/vent/offDurationSecs?period=night`, );
    console.log( `vent off duration (night) response status: ${ventOffNightRes.status}`, );
    const ventOffNightData = await ventOffNightRes.json();
    initialStatus.ventOffDurationNightSecs = ventOffNightData.night; // Assuming the API returns { day: value, night: value }

    //sensor soil moisture raw - 'dryness' reading - not a percentage. e.g something like 1960 to 2020 values
    console.log(`Fetching sensor Raw soil moisture reading from: ${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`, );
    const sensorSoilMoistureRaw = await fetch( `${API_URL}/api/mqtt/soil1/sensor_method5_batch_moving_average_float`, );
    console.log( `Soil moisture response status: ${sensorSoilMoistureRaw.status}`, );
    const sensorSoilMoistureRawData = await sensorSoilMoistureRaw.json();
    initialStatus.sensorSoilMoistureRaw = sensorSoilMoistureRawData.message;

    //get soil moisture percentage from api
    console.log(
      `Fetching soil moisture percentage from: ${API_URL}/api/soilMoisturePercent`,
    );
    const soilMoisturePercent = await fetch(
      `${API_URL}/api/soilMoisturePercent`,
    );
    console.log(`Soil moisture response status: ${soilMoisturePercent.status}`);
    const soilMoisturePercentData = await soilMoisturePercent.json();
    initialStatus.soilMoisturePercent = soilMoisturePercentData.message;

    console.log(
      `Fetching irrigation pump from: ${API_URL}/api/mqtt/irrigationPump/status`,
    );
    const irrigationPumpRes = await fetch(
      `${API_URL}/api/mqtt/irrigationPump/status`,
    );
    console.log(`Irrigation pump response status: ${irrigationPumpRes.status}`);
    const irrigationPumpData = await irrigationPumpRes.json();
    initialStatus.irrigationPump = irrigationPumpData.message;

    console.log(
      `Fetching outside temperature from: ${API_URL}/api/outside-temperature`,
    );
    const outsideTemperatureRes = await fetch(
      `${API_URL}/api/outside-temperature`,
    );
    console.log(
      `Outside temperature response status: ${outsideTemperatureRes.status}`,
    );
    const outsideTemperatureData = await outsideTemperatureRes.json();
    initialStatus.outsideTemperature = outsideTemperatureData.message;
  } catch (error) {
    console.error('ZZZZZZZZZZZZZZZZZ  Failed to fetch initial status:', error);
  }

    console.log('Final initialStatus object:', initialStatus);


  try {
    initialStatus.gitBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
    initialStatus.gitCommit = execSync('git log -1 --pretty=%B')
      .toString()
      .trim();
  } catch (error) {
    console.error('Failed to fetch git info:', error);
    initialStatus.gitBranch = 'N/A';
    initialStatus.gitCommit = 'N/A';
  }

  return {
    props: {
      initialStatus,
    },
  };
}

export default StatusBootstrapPage;
