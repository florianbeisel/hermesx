import { BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import path from 'path';
import { userConfig } from './main';

export class SettingsWindow {
  private window: BrowserWindow | null = null;

  public open() {
    if (this.window) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 600,
      height: 800,
      title: 'Settings',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Create the HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Settings</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 20px;
              color: #333;
              background-color: #f5f5f5;
            }
            .section {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h2 {
              margin-top: 0;
              color: #2c3e50;
            }
            label {
              display: block;
              margin: 10px 0 5px;
            }
            input[type="number"], input[type="time"] {
              width: 100px;
              padding: 5px;
              margin-right: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            input[type="checkbox"] {
              margin-right: 5px;
            }
            button {
              background-color: #3498db;
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 10px;
              transition: background-color 0.2s;
            }
            button:hover {
              background-color: #2980b9;
            }
            .workdays {
              display: flex;
              gap: 10px;
              margin: 10px 0;
            }
            .workday-label {
              display: flex;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="section">
            <h2>Debug</h2>
            <label>
              <input type="checkbox" id="debugMode" />
              Debug Mode
            </label>
          </div>
          <div class="section">
            <h2>Credentials</h2>
            <div style="margin-bottom: 15px;">
              <label>Username:
                <input type="text" id="username" placeholder="Enter username" />
              </label>
            </div>
            <div style="margin-bottom: 15px;">
              <label>Password:
                <input type="password" id="password" placeholder="Enter password" />
              </label>
            </div>
            <button id="saveCredentialsBtn" style="margin-right: 10px;">Save Credentials</button>
            <button id="clearCredentialsBtn" style="background-color: #e74c3c;">Clear Credentials</button>
          </div>
          <div class="section">
            <h2>Work Schedule</h2>
            <label>Start Time:
              <input type="time" id="startTime" />
            </label>
            <label>Work Duration (hours):
              <input type="number" id="workDuration" min="1" max="24" />
            </label>
            <label>Break Duration (minutes):
              <input type="number" id="breakDuration" min="5" max="120" />
            </label>
            <label>
              <input type="checkbox" id="isFlexible" />
              Flexible Schedule
            </label>
            <div class="workdays">
              <label class="workday-label">
                <input type="checkbox" id="sun" /> Sun
              </label>
              <label class="workday-label">
                <input type="checkbox" id="mon" /> Mon
              </label>
              <label class="workday-label">
                <input type="checkbox" id="tue" /> Tue
              </label>
              <label class="workday-label">
                <input type="checkbox" id="wed" /> Wed
              </label>
              <label class="workday-label">
                <input type="checkbox" id="thu" /> Thu
              </label>
              <label class="workday-label">
                <input type="checkbox" id="fri" /> Fri
              </label>
              <label class="workday-label">
                <input type="checkbox" id="sat" /> Sat
              </label>
            </div>
          </div>

          <div class="section">
            <h2>Notifications</h2>
            <label>
              <input type="checkbox" id="quietMode" />
              Quiet Mode
            </label>
            <label>
              <input type="checkbox" id="smartFlexibility" />
              Smart Flexibility
            </label>
            <label>
              <input type="checkbox" id="workModeDetection" />
              Work Mode Detection
            </label>
            <label>
              <input type="checkbox" id="autoCheckIn" />
              Auto Check-In
            </label>
            <label>
              <input type="checkbox" id="autoCheckOut" />
              Auto Check-Out
            </label>
            <label>
              <input type="checkbox" id="suppressDuringCalls" />
              Suppress During Calls
            </label>
            <label>
              <input type="checkbox" id="suppressDuringGaming" />
              Suppress During Gaming
            </label>
          </div>

          <div class="section">
            <h2>Inactivity Thresholds (minutes)</h2>
            <label>Short Break Reminder:
              <input type="number" id="shortBreakReminder" min="1" max="480" />
            </label>
            <label>Long Break Reminder:
              <input type="number" id="longBreakReminder" min="1" max="480" />
            </label>
            <label>Auto Break Suggestion:
              <input type="number" id="autoBreakSuggestion" min="1" max="60" />
            </label>
            <label>Auto Check-Out:
              <input type="number" id="autoCheckOut" min="1" max="60" />
            </label>
          </div>

          <div class="section">
            <h2>ZeusX Button Configuration</h2>
            <div id="buttonMappingSection" style="display: none;">
              <div id="buttonMappings"></div>
              <button id="fetchZeusXButtons" style="margin-right: 10px;">Fetch ZeusX Buttons</button>
              <button id="saveButtonMappings">Save Button Mappings</button>
            </div>
            <div id="noCredentials">
              Please save your credentials first to configure ZeusX buttons.
            </div>
          </div>

          <button onclick="window.electronAPI.saveConfig(getFormData())">Save Settings</button>

          <script>
            // Initial config from main process
            const config = ${JSON.stringify(userConfig)};
            
            function setFormData() {
              // Set initial values
              document.getElementById('startTime').value = 
                \`\${String(config.schedule.startTime.hour).padStart(2, '0')}:\${String(config.schedule.startTime.minute).padStart(2, '0')}\`;
              document.getElementById('workDuration').value = config.schedule.workDuration;
              document.getElementById('breakDuration').value = config.schedule.breakDuration;
              document.getElementById('isFlexible').checked = config.schedule.isFlexible;
              
              // Set workdays
              ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((day, index) => {
                document.getElementById(day).checked = config.schedule.workdays[index];
              });

              // Set notification preferences
              Object.keys(config.notifications).forEach(key => {
                const element = document.getElementById(key);
                if (element) element.checked = config.notifications[key];
              });

              // Set thresholds
              Object.keys(config.inactivityThresholds).forEach(key => {
                const element = document.getElementById(key);
                if (element) element.value = config.inactivityThresholds[key];
              });

              document.getElementById('debugMode').checked = config.debug;
            }

            function getFormData() {
              const startTimeParts = document.getElementById('startTime').value.split(':');
              
              return {
                schedule: {
                  startTime: {
                    hour: parseInt(startTimeParts[0]),
                    minute: parseInt(startTimeParts[1])
                  },
                  workDuration: parseInt(document.getElementById('workDuration').value),
                  breakDuration: parseInt(document.getElementById('breakDuration').value),
                  isFlexible: document.getElementById('isFlexible').checked,
                  workdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(
                    day => document.getElementById(day).checked
                  )
                },
                notifications: {
                  quietMode: document.getElementById('quietMode').checked,
                  smartFlexibility: document.getElementById('smartFlexibility').checked,
                  workModeDetection: document.getElementById('workModeDetection').checked,
                  autoCheckIn: document.getElementById('autoCheckIn').checked,
                  autoCheckOut: document.getElementById('autoCheckOut').checked,
                  suppressDuringCalls: document.getElementById('suppressDuringCalls').checked,
                  suppressDuringGaming: document.getElementById('suppressDuringGaming').checked
                },
                inactivityThresholds: {
                  shortBreakReminder: parseInt(document.getElementById('shortBreakReminder').value),
                  longBreakReminder: parseInt(document.getElementById('longBreakReminder').value),
                  autoBreakSuggestion: parseInt(document.getElementById('autoBreakSuggestion').value),
                  autoCheckOut: parseInt(document.getElementById('autoCheckOut').value)
                },
                debug: document.getElementById('debugMode').checked
              };
            }

            // Credentials management functions
            async function loadCredentials() {
              console.log('Loading credentials...');
              const credentials = await window.electronAPI.getCredentials();
              console.log('Received credentials:', credentials ? 'Found' : 'Not found');
              if (credentials) {
                console.log('Setting credential fields');
                document.getElementById('username').value = credentials.username || '';
                document.getElementById('password').value = credentials.password || '';
              }
            }

            async function handleSaveCredentials() {
              console.log('Save credentials clicked');
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              
              console.log('Credentials to save - Username:', username ? 'Present' : 'Missing', 'Password:', password ? 'Present' : 'Missing');
              
              if (!username || !password) {
                alert('Please enter both username and password');
                return;
              }

              console.log('Attempting to save credentials...');
              const result = await window.electronAPI.saveCredentialsToMain({ username, password });
              console.log('Save result:', result);
              
              if (result.success) {
                alert('Credentials saved successfully');
                document.getElementById('buttonMappingSection').style.display = 'block';
                document.getElementById('noCredentials').style.display = 'none';
              } else {
                alert('Failed to save credentials: ' + result.error);
              }
            }

            async function handleClearCredentials() {
              if (confirm('Are you sure you want to clear saved credentials?')) {
                console.log('Clearing credentials...');
                await window.electronAPI.clearCredentialsFromMain();
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                alert('Credentials cleared');
              }
            }

            // Add styles for button mapping
            const styleSheet = document.createElement("style");
            styleSheet.textContent = 
              '.button-mapping { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }' +
              '.button-mapping select { margin: 5px; padding: 5px; border-radius: 4px; }' +
              '.button-mapping label { display: inline-block; width: 120px; }';
            document.head.appendChild(styleSheet);

            // Set up event listeners when the document loads
            document.addEventListener('DOMContentLoaded', () => {
              setFormData();
              loadCredentials();

              // Add button click handlers
              document.getElementById('saveCredentialsBtn').addEventListener('click', handleSaveCredentials);
              document.getElementById('clearCredentialsBtn').addEventListener('click', handleClearCredentials);
              document.getElementById('fetchZeusXButtons').addEventListener('click', handleFetchZeusXButtons);
              document.getElementById('saveButtonMappings').addEventListener('click', handleSaveButtonMappings);

              // Check if credentials exist to show/hide button mapping section
              window.electronAPI.getCredentials().then(credentials => {
                if (credentials?.username && credentials?.password) {
                  document.getElementById('buttonMappingSection').style.display = 'block';
                  document.getElementById('noCredentials').style.display = 'none';
                }
              });
            });

            async function handleFetchZeusXButtons() {
              try {
                const buttons = await window.electronAPI.fetchZeusXButtons();
                const states = ['NOT_WORKING', 'WORKING', 'PAUSED', 'FINISHED'];
                const transitions = {
                  NOT_WORKING: ['Start Work'],
                  WORKING: ['Start Break', 'Finish Work'],
                  PAUSED: ['Return from Break', 'Finish Work'],
                  FINISHED: []
                };

                const buttonMappingsDiv = document.getElementById('buttonMappings');
                buttonMappingsDiv.innerHTML = '';

                // Create a section for each state
                states.forEach(state => {
                  if (transitions[state].length === 0) return; // Skip states with no actions

                  const stateSection = document.createElement('div');
                  stateSection.className = 'state-section';
                  
                  const stateHeader = document.createElement('h3');
                  stateHeader.textContent = state;
                  stateSection.appendChild(stateHeader);

                  // Create dropdown for each action in this state
                  transitions[state].forEach(action => {
                    const actionDiv = document.createElement('div');
                    actionDiv.className = 'action-mapping';
                    
                    const actionLabel = document.createElement('label');
                    actionLabel.textContent = action + ': ';
                    
                    const buttonSelect = document.createElement('select');
                    buttonSelect.className = 'button-select';
                    
                    // Add an "Unset" option
                    const unsetOption = document.createElement('option');
                    unsetOption.value = '';
                    unsetOption.textContent = '-- Select Button --';
                    buttonSelect.appendChild(unsetOption);
                    
                    // Add all available buttons as options
                    buttons.forEach(button => {
                      const option = document.createElement('option');
                      option.value = button.id;
                      option.textContent = button.label + ' (' + button.id + ')';
                      buttonSelect.appendChild(option);
                    });

                    actionDiv.appendChild(actionLabel);
                    actionDiv.appendChild(buttonSelect);
                    stateSection.appendChild(actionDiv);
                  });

                  buttonMappingsDiv.appendChild(stateSection);
                });

                // Add styles for the new layout
                const styleSheet = document.createElement("style");
                styleSheet.textContent = 
                  '.state-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }' +
                  '.state-section h3 { margin: 0 0 15px 0; color: #333; }' +
                  '.action-mapping { margin: 10px 0; }' +
                  '.action-mapping label { display: inline-block; width: 150px; }' +
                  '.button-select { width: 250px; padding: 5px; margin-left: 10px; }';
                document.head.appendChild(styleSheet);

                // Load existing mappings if available
                window.electronAPI.loadButtonMappings().then(mappings => {
                  document.querySelectorAll('.action-mapping').forEach(mapping => {
                    const state = mapping.closest('.state-section').querySelector('h3').textContent;
                    const action = mapping.querySelector('label').textContent.replace(': ', '');
                    const buttonSelect = mapping.querySelector('.button-select');
                    
                    const existingMapping = mappings.find(m => 
                      m.state === state && m.action === action
                    );
                    
                    if (existingMapping) {
                      buttonSelect.value = existingMapping.buttonId;
                    }
                  });
                });
              } catch (error) {
                console.error('Failed to fetch ZeusX buttons:', error);
                alert('Failed to fetch ZeusX buttons. Please check your credentials and try again.');
              }
            }

            async function handleSaveButtonMappings() {
              const mappings = [];
              document.querySelectorAll('.action-mapping').forEach(mapping => {
                const state = mapping.closest('.state-section').querySelector('h3').textContent;
                const action = mapping.querySelector('label').textContent.replace(': ', '');
                const buttonSelect = mapping.querySelector('.button-select');
                
                if (buttonSelect.value) { // Only save if a button is selected
                  mappings.push({
                    state: state,
                    action: action,
                    buttonId: buttonSelect.value
                  });
                }
              });

              try {
                await window.electronAPI.saveButtonMappings(mappings);
                alert('Button mappings saved successfully');
              } catch (error) {
                console.error('Failed to save button mappings:', error);
                alert('Failed to save button mappings');
              }
            }
          </script>
        </body>
      </html>
    `;

    // Write the HTML content to a temporary file
    const tempPath = path.join(app.getPath('temp'), 'settings.html');
    fs.writeFileSync(tempPath, htmlContent);

    // Load the temporary file
    this.window.loadFile(tempPath);

    this.window.on('closed', () => {
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error('Error cleaning up temporary file:', error);
      }
      this.window = null;
    });
  }
}
