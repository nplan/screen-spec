// Screen Manager - Centralized state and operations
class ScreenManager {
    constructor() {
        this.screens = [];
        this.visualizer = new ScreenVisualizer('screenCanvas');
        this.validator = new ValidationManager();
        this.screensContainer = document.getElementById('screens-container');
        this.addWrapper = document.getElementById('add-wrapper');
        this.nextId = 1;
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
        this.usedNumbers = new Set(); // Track which screen numbers are in use
        
        this.init();
    }
    
    init() {
        // Initialize with first screen
        this.addScreen({
            preset: '24-1920-1080',
            diagonal: 24,
            width: 1920,
            height: 1080,
            distance: 600,
            curvature: null,
            scaling: 100
        });
        
        // Setup visualizer controls
        document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.visualizer.setViewMode(e.target.value);
            });
        });
        
        // Setup add button
        document.getElementById('add-screen').addEventListener('click', () => {
            if (this.screens.length < 4) {
                this.addScreen({
                    preset: '24-1920-1080',
                    diagonal: 24,
                    width: 1920,
                    height: 1080,
                    distance: 600,
                    curvature: null,
                    scaling: 100
                });
            }
        });
        
        // Setup reset button
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetToDefault();
        });
        
        // Setup screen number click for removal
        this.screensContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('screen-number') && !e.target.classList.contains('no-close')) {
                const screenId = e.target.closest('.container').dataset.screenId;
                this.removeScreen(screenId);
            }
        });
    }
    
    addScreen(data = {}) {
        const screenId = this.nextId++;
        
        // Find the lowest available screen number
        let screenNumber = 1;
        while (this.usedNumbers.has(screenNumber)) {
            screenNumber++;
        }
        this.usedNumbers.add(screenNumber);
        
        const screenData = {
            id: screenId,
            screenNumber: screenNumber,
            preset: data.preset || '',
            diagonal: data.diagonal || null,
            width: data.width || null,
            height: data.height || null,
            distance: data.distance || 600,
            curvature: data.curvature || null,
            scaling: data.scaling || 100
        };
        
        this.screens.push(screenData);
        this.renderScreen(screenData);
        this.updateAddButtonVisibility();
        this.updateCloseButtonAvailability();
        this.updateVisualizer();
    }
    
    removeScreen(screenId) {
        if (this.screens.length <= 1) return;
        
        const screenData = this.screens.find(screen => screen.id == screenId);
        if (screenData) {
            this.usedNumbers.delete(screenData.screenNumber);
        }
        
        // Clear any validation errors before removing
        this.validator.clearAllErrors(screenId);
        
        this.screens = this.screens.filter(screen => screen.id != screenId);
        document.querySelector(`[data-screen-id="${screenId}"]`).remove();
        this.updateAddButtonVisibility();
        this.updateCloseButtonAvailability();
        this.updateVisualizer();
    }
    
    updateScreen(screenId, field, value) {
        const screen = this.screens.find(s => s.id == screenId);
        if (!screen) return;

        // Update the screen data
        screen[field] = value;
        
        // Update error display for the entire screen
        this.validator.updateErrorDisplay(screenId);
        
        // Update calculations and visualizer
        this.calculateAndRenderScreen(screenId);
        this.updateVisualizer();
    }
    
    renderScreen(screenData) {
        const container = this.createScreenElement(screenData);
        this.screensContainer.insertBefore(container, this.addWrapper);
        this.attachListeners(container, screenData.id);
        this.calculateAndRenderScreen(screenData.id);
    }
    
    createScreenElement(screenData) {
        const template = this.screensContainer.querySelector('.container');
        const container = template.cloneNode(true);
        
        container.dataset.screenId = screenData.id;
        container.style.display = 'block'; // Make the cloned container visible
        
        // Set screen number and color based on persistent screenNumber
        const screenNumber = screenData.screenNumber;
        const color = this.colors[(screenNumber - 1) % this.colors.length];
        
        const numberElement = container.querySelector('.screen-number');
        numberElement.innerHTML = `<span class="number-text">${screenNumber}</span>`;
        numberElement.style.backgroundColor = color;
        numberElement.style.borderColor = color;
        
        // Set no-close class if this is the only screen
        if (this.screens.length === 1) {
            numberElement.classList.add('no-close');
        }
        
        // Update IDs and values
        const elements = [
            'preset', 'diagonal', 'width', 'height', 
            'distance', 'curvature', 'scaling'
        ];
        
        elements.forEach(name => {
            const input = container.querySelector(`[id^="${name}-"]`);
            const label = container.querySelector(`label[for^="${name}-"]`);
            
            if (input) {
                input.id = `${name}-${screenData.id}`;
                input.value = screenData[name] || (name === 'scaling' ? '100' : '');
                if (name === 'curvature' && !screenData[name]) {
                    input.placeholder = 'Flat';
                }
            }
            if (label) {
                label.setAttribute('for', `${name}-${screenData.id}`);
            }
        });

        // Update validation error container IDs
        const errorContainer = container.querySelector(`#validation-errors-template`);
        const errorList = container.querySelector(`#error-list-template`);
        if (errorContainer) {
            errorContainer.id = `validation-errors-${screenData.id}`;
        }
        if (errorList) {
            errorList.id = `error-list-${screenData.id}`;
        }
        
        return container;
    }
    
    attachListeners(container, screenId) {
        const inputs = {
            preset: container.querySelector(`#preset-${screenId}`),
            diagonal: container.querySelector(`#diagonal-${screenId}`),
            width: container.querySelector(`#width-${screenId}`),
            height: container.querySelector(`#height-${screenId}`),
            distance: container.querySelector(`#distance-${screenId}`),
            curvature: container.querySelector(`#curvature-${screenId}`),
            scaling: container.querySelector(`#scaling-${screenId}`)
        };

        // Debounce helper for validation
        const debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };

        inputs.preset.addEventListener('change', (e) => {
            const value = e.target.value;
            // Clear any validation errors for preset (it's not validated)
            inputs.preset.classList.remove('input-error');
            
            if (value) {
                const [diag, w, h] = value.split('-');
                this.updateScreen(screenId, 'preset', value);
                this.updateScreen(screenId, 'diagonal', parseFloat(diag));
                this.updateScreen(screenId, 'width', parseInt(w));
                this.updateScreen(screenId, 'height', parseInt(h));
                
                // Update DOM values
                inputs.diagonal.value = diag;
                inputs.width.value = w;
                inputs.height.value = h;
            } else {
                this.updateScreen(screenId, 'preset', '');
            }
        });

        const updatePreset = () => {
            const diagVal = parseFloat(inputs.diagonal.value);
            const wVal = parseInt(inputs.width.value);
            const hVal = parseInt(inputs.height.value);

            this.updateScreen(screenId, 'diagonal', diagVal);
            this.updateScreen(screenId, 'width', wVal);
            this.updateScreen(screenId, 'height', hVal);

            if (!isNaN(diagVal) && !isNaN(wVal) && !isNaN(hVal)) {
                const matchingOption = Array.from(inputs.preset.options).find(option => {
                    if (!option.value) return false;
                    const [optDiag, optW, optH] = option.value.split('-').map((v, i) => i === 0 ? parseFloat(v) : parseInt(v));
                    return optDiag === diagVal && optW === wVal && optH === hVal;
                });
                
                const presetValue = matchingOption ? matchingOption.value : '';
                inputs.preset.value = presetValue;
                this.updateScreen(screenId, 'preset', presetValue);
            } else {
                inputs.preset.value = '';
                this.updateScreen(screenId, 'preset', '');
            }
        };

        // Debounced input handlers for better UX
        const debouncedUpdatePreset = debounce(updatePreset, 100);
        
        // Add immediate validation on blur for better feedback
        const addImmediateValidation = (input, fieldName) => {
            input.addEventListener('blur', () => {
                // Update error display for entire screen
                this.validator.updateErrorDisplay(screenId);
            });
        };
        
        inputs.diagonal.addEventListener('input', debouncedUpdatePreset);
        inputs.width.addEventListener('input', debouncedUpdatePreset);
        inputs.height.addEventListener('input', debouncedUpdatePreset);
        
        // Add immediate validation
        addImmediateValidation(inputs.diagonal, 'diagonal');
        addImmediateValidation(inputs.width, 'width');
        addImmediateValidation(inputs.height, 'height');
        
        inputs.distance.addEventListener('input', debounce(() => {
            this.updateScreen(screenId, 'distance', parseFloat(inputs.distance.value));
        }, 100));
        
        addImmediateValidation(inputs.distance, 'distance');
        
        inputs.curvature.addEventListener('input', debounce(() => {
            const value = inputs.curvature.value;
            if (value === '0') {
                inputs.curvature.value = '';
            }
            const curvature = value === '' || value === '0' ? null : parseFloat(value);
            this.updateScreen(screenId, 'curvature', curvature);
        }, 100));
        
        addImmediateValidation(inputs.curvature, 'curvature');
        
        inputs.scaling.addEventListener('input', debounce(() => {
            this.updateScreen(screenId, 'scaling', parseFloat(inputs.scaling.value));
        }, 100));
        
        addImmediateValidation(inputs.scaling, 'scaling');
    }
    
    calculateAndRenderScreen(screenId) {
        const screen = this.screens.find(s => s.id == screenId);
        const container = document.querySelector(`[data-screen-id="${screenId}"]`);
        
        if (!screen || !container) return;
        
        const outputContainers = container.querySelectorAll('.output-item');
        const nativeOutputs = outputContainers[0].querySelectorAll('.output-value');
        const scaledOutputs = outputContainers[1].querySelectorAll('.output-value');
        const nativeTitle = container.querySelector('.output-section-title');
        const scaledTitle = container.querySelectorAll('.output-section-title')[1];
        const scaledContainer = outputContainers[1];
        
        const showScaled = screen.scaling !== 100;
        nativeTitle.style.display = showScaled ? 'block' : 'none';
        scaledTitle.style.display = showScaled ? 'block' : 'none';
        scaledContainer.style.display = showScaled ? 'block' : 'none';
        
        if (showScaled) {
            outputContainers[0].classList.remove('no-margin');
        } else {
            outputContainers[0].classList.add('no-margin');
        }
        
        const { diagonal, width, height, distance, curvature, scaling } = screen;
        
        // Check if required fields have valid values
        const validation = this.validator.validateScreen(screen);
        if (!validation.isValid) {
            // If there are validation errors, still try to calculate if basic required fields are present
            if (!validation.validatedData.diagonal || !validation.validatedData.width || 
                !validation.validatedData.height || !validation.validatedData.distance || 
                !validation.validatedData.scaling) {
                this.renderEmptyOutputs(nativeOutputs, scaledOutputs, showScaled);
                return;
            }
        }

        // Use validated data for calculations
        const validatedData = validation.validatedData;
        const calcDiagonal = validatedData.diagonal || diagonal;
        const calcWidth = validatedData.width || width;
        const calcHeight = validatedData.height || height;
        const calcDistance = validatedData.distance || distance;
        const calcCurvature = validatedData.curvature !== undefined ? validatedData.curvature : curvature;
        const calcScaling = validatedData.scaling || scaling;

        try {
            const screenCalc = new Screen(calcDiagonal, [calcWidth, calcHeight], calcDistance, calcCurvature, calcScaling / 100);
            this.renderCalculatedOutputs(screenCalc, nativeOutputs, scaledOutputs, showScaled);
        } catch (error) {
            console.error('Calculation error:', error);
            this.renderErrorOutputs(nativeOutputs, scaledOutputs, showScaled, error.message);
        }
    }
    
    renderEmptyOutputs(nativeOutputs, scaledOutputs, showScaled) {
        nativeOutputs[0].textContent = '-- x --';
        nativeOutputs[1].textContent = '-- x --';
        nativeOutputs[2].innerHTML = '--<span class="output-unit">PPI</span>';
        nativeOutputs[3].innerHTML = '--<span class="output-unit">PPD</span>';
        if (showScaled) {
            scaledOutputs[0].textContent = '-- x --';
            scaledOutputs[1].innerHTML = '--<span class="output-unit">PPI</span>';
            scaledOutputs[2].innerHTML = '--<span class="output-unit">PPD</span>';
        }
    }
    
    renderCalculatedOutputs(screenCalc, nativeOutputs, scaledOutputs, showScaled) {
        nativeOutputs[0].innerHTML = `${Math.round(screenCalc.width)} x ${Math.round(screenCalc.height)}<span class="output-unit">mm</span>`;
        nativeOutputs[1].innerHTML = `${screenCalc.fov_horizontal.toFixed(1)} x ${screenCalc.fov_vertical.toFixed(1)}<span class="output-unit">deg</span>`;
        nativeOutputs[2].innerHTML = `${screenCalc.ppi}<span class="output-unit">PPI</span>`;
        nativeOutputs[3].innerHTML = `${screenCalc.ppd.toFixed(1)}<span class="output-unit">PPD</span>`;
        
        if (showScaled) {
            scaledOutputs[0].innerHTML = `${screenCalc.resolution_scaled[0]} x ${screenCalc.resolution_scaled[1]}<span class="output-unit">px</span>`;
            scaledOutputs[1].innerHTML = `${screenCalc.ppi_scaled}<span class="output-unit">PPI</span>`;
            scaledOutputs[2].innerHTML = `${screenCalc.ppd_scaled.toFixed(1)}<span class="output-unit">PPD</span>`;
        }
    }
    
    renderErrorOutputs(nativeOutputs, scaledOutputs, showScaled, errorMessage = 'Calculation Error') {
        const errorText = errorMessage.length > 20 ? 'Error' : errorMessage;
        nativeOutputs[0].textContent = errorText;
        nativeOutputs[1].textContent = errorText;
        nativeOutputs[2].innerHTML = `${errorText}<span class="output-unit">PPI</span>`;
        nativeOutputs[3].innerHTML = `${errorText}<span class="output-unit">PPD</span>`;
        if (showScaled) {
            scaledOutputs[0].textContent = errorText;
            scaledOutputs[1].innerHTML = `${errorText}<span class="output-unit">PPI</span>`;
            scaledOutputs[2].innerHTML = `${errorText}<span class="output-unit">PPD</span>`;
        }
    }
    
    updateRemoveButtonsVisibility() {
        // No longer needed since screen numbers handle removal
    }
    
    updateCloseButtonAvailability() {
        const containers = this.screensContainer.querySelectorAll('.container:not([data-screen-id="template"])');
        const hasOnlyOneScreen = containers.length === 1;
        
        containers.forEach((container) => {
            const numberElement = container.querySelector('.screen-number');
            
            // Add or remove no-close class based on whether this is the last screen
            if (hasOnlyOneScreen) {
                numberElement.classList.add('no-close');
            } else {
                numberElement.classList.remove('no-close');
            }
        });
    }
    
    updateAddButtonVisibility() {
        this.addWrapper.style.display = this.screens.length >= 4 ? 'none' : 'flex';
    }
    
    updateVisualizer() {
        const validScreens = this.screens
            .filter(screen => {
                const { diagonal, width, height, distance, scaling } = screen;
                return !isNaN(diagonal) && !isNaN(width) && !isNaN(height) && !isNaN(distance) && !isNaN(scaling);
            })
            .map(screen => {
                try {
                    const screenObj = new Screen(screen.diagonal, [screen.width, screen.height], screen.distance, screen.curvature, screen.scaling / 100);
                    // Preserve the screenNumber for visualization
                    screenObj.screenNumber = screen.screenNumber;
                    return screenObj;
                } catch (error) {
                    return null;
                }
            })
            .filter(screen => screen !== null);
        
        this.visualizer.updateScreens(validScreens);
    }
    
    resetToDefault() {
        // Remove all existing screen containers (except template)
        const containers = this.screensContainer.querySelectorAll('.container:not([data-screen-id="template"])');
        containers.forEach(container => container.remove());
        
        // Reset state
        this.screens = [];
        this.nextId = 1;
        this.usedNumbers.clear();
        
        // Add default screen
        this.addScreen({
            preset: '24-1920-1080',
            diagonal: 24,
            width: 1920,
            height: 1080,
            distance: 600,
            curvature: null,
            scaling: 100
        });
    }
}
