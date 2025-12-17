// Global variables
let trendsChart = null;
let showPrediction = true;
let predictionMonths = 24;
let lastGeneratedData = null;

// Uploaded data chart
let uploadedChart = null;
let uploadedFileData = null; // { rows: Array<object>, columns: string[], numericColumns: string[], categoricalColumns: string[] }

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set default dates
    setDefaultDates();
    
    // Bind event listeners
    bindEventListeners();
    
    // Initialize chart
    initializeChart();
}

function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 5);
    
    // Ensure start date is not before 1990
    const earliestDate = new Date('1990-01-01');
    if (startDate < earliestDate) {
        startDate.setTime(earliestDate.getTime());
    }
    
    document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
    document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
    
    // Set min attribute on date inputs to prevent selection of invalid dates
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput) startDateInput.min = '1990-01-01';
    if (endDateInput) endDateInput.min = '1990-01-01';
}

function bindEventListeners() {
    // Search functionality
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('keyword-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setPresetDate(this.dataset.years);
            updateActivePreset(this);
        });
    });
    
    // Suggestion tags
    document.querySelectorAll('.suggestion-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.getElementById('keyword-input').value = this.dataset.keyword;
            handleSearch();
        });
    });

    // Upload controls
    const fileInput = document.getElementById('data-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleDataFileSelected);
    }

    const chartTypeSelect = document.getElementById('chart-type');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', () => {
            updateAggregationVisibility();
            // If a chart already exists, re-render using the new type
            if (uploadedFileData) {
                renderUploadedChartFromUI();
            }
        });
    }

    const xColumnSelect = document.getElementById('x-column');
    if (xColumnSelect) {
        xColumnSelect.addEventListener('change', () => {
            updateAggregationVisibility();
            if (uploadedFileData) {
                renderUploadedChartFromUI();
            }
        });
    }

    const yColumnSelect = document.getElementById('y-column');
    if (yColumnSelect) {
        yColumnSelect.addEventListener('change', () => {
            updateAggregationVisibility();
            if (uploadedFileData) {
                renderUploadedChartFromUI();
            }
        });
    }

    const aggregationSelect = document.getElementById('aggregation');
    if (aggregationSelect) {
        aggregationSelect.addEventListener('change', () => {
            if (uploadedFileData) {
                renderUploadedChartFromUI();
            }
        });
    }

    const renderBtn = document.getElementById('render-upload-chart');
    if (renderBtn) {
        renderBtn.addEventListener('click', renderUploadedChartFromUI);
    }

    const downloadUploadBtn = document.getElementById('download-upload-chart');
    if (downloadUploadBtn) {
        downloadUploadBtn.addEventListener('click', downloadUploadedChart);
    }

    const clearBtn = document.getElementById('clear-upload-chart');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearUploadedChart);
    }
    
    // Chart controls
    const toggleBtn = document.getElementById('toggle-prediction');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', togglePrediction);
    }
    
    const downloadBtn = document.getElementById('download-chart');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadChart);
    }
    
    // Prediction slider
    const predictionSlider = document.getElementById('prediction-slider');
    if (predictionSlider) {
        predictionSlider.addEventListener('input', updatePredictionPeriod);
    }
    
    // Error modal
    const closeErrorBtn = document.getElementById('close-error');
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', hideErrorModal);
    }
}

function setPresetDate(years) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - parseInt(years));
    
    // Ensure start date is not before 1990
    const earliestDate = new Date('1990-01-01');
    if (startDate < earliestDate) {
        startDate.setTime(earliestDate.getTime());
    }
    
    document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
    document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
}

function updateActivePreset(activeBtn) {
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

function initializeChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    trendsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Search Interest',
                data: [],
                borderColor: '#f67280',
                backgroundColor: 'rgba(246, 114, 128, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#f67280',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'AI Prediction',
                data: [],
                borderColor: '#c06c84',
                backgroundColor: 'rgba(192, 108, 132, 0.1)',
                borderWidth: 3,
                borderDash: [10, 5],
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#c06c84',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].parsed.x).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            const isPrediction = datasetLabel === 'AI Prediction';
                            
                            if (isPrediction) {
                                return `🔮 ${datasetLabel}: ${value}% (Predicted)`;
                            } else {
                                return `📊 ${datasetLabel}: ${value}%`;
                            }
                        },
                        afterBody: function(context) {
                            // Add extra info for prediction points
                            const isPrediction = context[0].dataset.label === 'AI Prediction';
                            if (isPrediction) {
                                return '\nThis is a predicted value based on historical trends';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy',
                            quarter: '[Q]Q yyyy',
                            year: 'yyyy'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666'
                    },
                    title: {
                        display: true,
                        text: 'Search Interest',
                        color: '#666'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function handleSearch() {
    const keyword = document.getElementById('keyword-input').value.trim();
    
    if (!keyword) {
        showErrorModal('Please enter a keyword to search.');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Simulate API call with timeout
    setTimeout(() => {
        try {
            // Generate mock data
            const data = generateMockTrendsData(keyword);
            lastGeneratedData = data; // Store for slider updates
            
            // Update chart
            updateChart(data);
            
            // Update stats
            updateStats(data);
            
            // Show sections
            showResultSections();
            
            // Update chart title
            const titleEl = document.getElementById('chart-title');
            if (titleEl) {
                titleEl.textContent = `"${keyword}" Search Trends`;
            }
            
        } catch (error) {
            console.error('Error:', error);
            showErrorModal(error.message || 'Failed to generate trends data. Please try again.');
        } finally {
            hideLoadingState();
        }
    }, 1500);
}

function generateMockTrendsData(keyword) {
    // Get selected date range
    const startDateStr = document.getElementById('start-date').value;
    const endDateStr = document.getElementById('end-date').value;
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const now = new Date();
    
    // Validate dates - search engines didn't exist before 1990
    // Google started in 1998, but we'll be generous and allow 1990
    const earliestValidDate = new Date('1990-01-01');
    const latestValidDate = new Date(); // Current date
    
    if (startDate < earliestValidDate) {
        throw new Error(`Search trends data is not available before 1990. Please select a start date after January 1, 1990.`);
    }
    
    if (endDate < earliestValidDate) {
        throw new Error(`Search trends data is not available before 1990. Please select an end date after January 1, 1990.`);
    }
    
    if (startDate > latestValidDate) {
        throw new Error(`Start date cannot be in the future. Please select a valid start date.`);
    }
    
    if (endDate < startDate) {
        throw new Error(`End date must be after start date. Please check your date selection.`);
    }
    
    // Calculate time period in years for granularity
    const totalYears = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    
    // Determine time granularity based on period
    let interval, timeUnit;
    if (totalYears <= 2) {
        interval = 'month';
        timeUnit = 30; // days
    } else if (totalYears <= 8) {
        interval = 'quarter';
        timeUnit = 90; // days
    } else {
        interval = 'year';
        timeUnit = 365; // days
    }
    
    const historical = [];
    const prediction = [];
    const baseValue = Math.random() * 50 + 25;
    
    // Generate historical data from start date to current date (or end date if in past)
    const actualEndDate = endDate > now ? now : endDate;
    let currentDate = new Date(startDate);
    let dataIndex = 0;
    
    while (currentDate <= actualEndDate) {
        const monthsFromStart = (currentDate - startDate) / (30.44 * 24 * 60 * 60 * 1000);
        
        // Add seasonality, trend, and noise
        const seasonal = Math.sin((monthsFromStart / 12) * 2 * Math.PI) * 15;
        const trend = monthsFromStart * 0.3;
        const noise = (Math.random() - 0.5) * 20;
        
        let value = baseValue + seasonal + trend + noise;
        value = Math.max(0, Math.min(100, value));
        
        historical.push({
            x: currentDate.toISOString().split('T')[0],
            y: Math.round(value)
        });
        
        // Move to next data point based on granularity
        if (interval === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (interval === 'quarter') {
            currentDate.setMonth(currentDate.getMonth() + 3);
        } else {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        dataIndex++;
    }
    
    // Generate predictions starting from the last historical point
    const lastHistoricalPoint = historical.length > 0 ? historical[historical.length - 1] : null;
    const lastValue = lastHistoricalPoint ? lastHistoricalPoint.y : baseValue;
    const lastDate = lastHistoricalPoint ? new Date(lastHistoricalPoint.x) : actualEndDate;
    
    // Add the connection point (last historical point) as the first prediction point
    if (lastHistoricalPoint) {
        prediction.push({
            x: lastHistoricalPoint.x,
            y: lastHistoricalPoint.y
        });
    }
    
    // Start predictions from current date (now) moving forward
    let predictionDate = new Date(now);
    if (interval === 'month') {
        predictionDate.setMonth(predictionDate.getMonth() + 1);
    } else if (interval === 'quarter') {
        predictionDate.setMonth(predictionDate.getMonth() + 3);
    } else {
        predictionDate.setFullYear(predictionDate.getFullYear() + 1);
    }
    
    // Use slider value to determine prediction periods
    const maxPeriods = interval === 'month' ? predictionMonths : (interval === 'quarter' ? Math.ceil(predictionMonths / 3) : Math.ceil(predictionMonths / 12));
    const predictionPeriods = Math.min(maxPeriods, 60); // Max 60 periods
    
    for (let i = 0; i < predictionPeriods; i++) {
        const monthsFromLastData = (predictionDate - lastDate) / (30.44 * 24 * 60 * 60 * 1000);
        
        // Apply trend with some randomness
        const seasonal = Math.sin((monthsFromLastData / 12) * 2 * Math.PI) * 10;
        const trend = monthsFromLastData * 0.15;
        const noise = (Math.random() - 0.5) * 15;
        
        let value = lastValue + seasonal + trend + noise;
        value = Math.max(5, Math.min(95, value));
        
        prediction.push({
            x: predictionDate.toISOString().split('T')[0],
            y: Math.round(value)
        });
        
        // Move to next prediction point
        if (interval === 'month') {
            predictionDate.setMonth(predictionDate.getMonth() + 1);
        } else if (interval === 'quarter') {
            predictionDate.setMonth(predictionDate.getMonth() + 3);
        } else {
            predictionDate.setFullYear(predictionDate.getFullYear() + 1);
        }
    }
    
    return {
        historical: historical,
        prediction: prediction,
        timeUnit: interval,
        maxInterest: historical.length > 0 ? Math.max(...historical.map(d => d.y)) : 0,
        avgInterest: historical.length > 0 ? Math.round(historical.reduce((sum, d) => sum + d.y, 0) / historical.length) : 0,
        peakDate: historical.length > 0 ? historical.reduce((max, d) => d.y > max.y ? d : max).x : startDateStr,
        trendDirection: calculateTrendDirection(historical)
    };
}

function calculateTrendDirection(data) {
    if (data.length < 2) return '➡️ Stable';
    
    const first = data.slice(0, Math.floor(data.length / 2));
    const second = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = first.reduce((sum, d) => sum + d.y, 0) / first.length;
    const secondAvg = second.reduce((sum, d) => sum + d.y, 0) / second.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return '📈 Rising';
    if (change < -10) return '📉 Falling';
    return '➡️ Stable';
}

function updateChart(data) {
    if (!trendsChart) return;
    
    // Update chart time unit based on data granularity
    if (data.timeUnit) {
        trendsChart.options.scales.x.time.unit = data.timeUnit;
        
        // Adjust point radius based on data density
        const totalDataPoints = data.historical.length + data.prediction.length;
        const pointRadius = totalDataPoints > 50 ? 2 : totalDataPoints > 20 ? 3 : 4;
        const pointHoverRadius = pointRadius + 2;
        
        trendsChart.data.datasets[0].pointRadius = pointRadius;
        trendsChart.data.datasets[0].pointHoverRadius = pointHoverRadius;
        trendsChart.data.datasets[1].pointRadius = pointRadius;
        trendsChart.data.datasets[1].pointHoverRadius = pointHoverRadius;
        
        // Update tooltip format based on time unit while preserving label and afterBody callbacks
        if (data.timeUnit === 'year') {
            trendsChart.options.plugins.tooltip.callbacks.title = function(context) {
                return new Date(context[0].parsed.x).getFullYear().toString();
            };
        } else if (data.timeUnit === 'quarter') {
            trendsChart.options.plugins.tooltip.callbacks.title = function(context) {
                const date = new Date(context[0].parsed.x);
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                return `Q${quarter} ${date.getFullYear()}`;
            };
        } else {
            trendsChart.options.plugins.tooltip.callbacks.title = function(context) {
                return new Date(context[0].parsed.x).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                });
            };
        }
        
        // Ensure label and afterBody callbacks are preserved
        trendsChart.options.plugins.tooltip.callbacks.label = function(context) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            const isPrediction = datasetLabel === 'AI Prediction';
            
            if (isPrediction) {
                return `🔮 ${datasetLabel}: ${value}% (Predicted)`;
            } else {
                return `📊 ${datasetLabel}: ${value}%`;
            }
        };
        
        trendsChart.options.plugins.tooltip.callbacks.afterBody = function(context) {
            const isPrediction = context[0].dataset.label === 'AI Prediction';
            if (isPrediction) {
                return '\nThis is a predicted value based on historical trends';
            }
            return '';
        };
    }
    
    // Update historical data
    trendsChart.data.datasets[0].data = data.historical;
    
    // Update prediction data
    trendsChart.data.datasets[1].data = data.prediction;
    trendsChart.data.datasets[1].hidden = !showPrediction;
    
    trendsChart.update('active');
}

function updateStats(data) {
    const elements = {
        'max-interest': data.maxInterest,
        'avg-interest': data.avgInterest,
        'peak-date': new Date(data.peakDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        'trend-direction': data.trendDirection
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function showLoadingState() {
    const btn = document.getElementById('search-btn');
    if (!btn) return;
    
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    
    btn.disabled = true;
}

function hideLoadingState() {
    const btn = document.getElementById('search-btn');
    if (!btn) return;
    
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    if (btnText) btnText.classList.remove('hidden');
    if (btnLoading) btnLoading.classList.add('hidden');
    
    btn.disabled = false;
}

function showResultSections() {
    const chartSection = document.getElementById('chart-section');
    const statsSection = document.getElementById('stats-section');
    
    if (chartSection) {
        chartSection.style.display = 'block';
        setTimeout(() => chartSection.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    
    if (statsSection) {
        statsSection.style.display = 'block';
    }
}

function togglePrediction() {
    showPrediction = !showPrediction;
    
    if (trendsChart) {
        trendsChart.data.datasets[1].hidden = !showPrediction;
        trendsChart.update('active');
    }
    
    const btn = document.getElementById('toggle-prediction');
    if (btn) {
        btn.innerHTML = showPrediction ? 
            '<span class="control-icon">🔮</span>Hide Prediction' : 
            '<span class="control-icon">🔮</span>Show Prediction';
    }
}

function downloadChart() {
    if (!trendsChart) return;
    
    const link = document.createElement('a');
    link.download = 'trends-chart.png';
    link.href = trendsChart.toBase64Image();
    link.click();
}

function showErrorModal(message) {
    const modal = document.getElementById('error-modal');
    const messageEl = document.getElementById('error-message');
    
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.classList.remove('hidden');
}

function hideErrorModal() {
    const modal = document.getElementById('error-modal');
    if (modal) modal.classList.add('hidden');
}

function updatePredictionPeriod() {
    const slider = document.getElementById('prediction-slider');
    const valueSpan = document.getElementById('prediction-value');
    
    if (!slider || !valueSpan) return;
    
    predictionMonths = parseInt(slider.value);
    valueSpan.textContent = `${predictionMonths} months`;
    
    // If we have previously generated data, regenerate with new prediction period
    if (lastGeneratedData && trendsChart) {
        const keyword = document.getElementById('keyword-input').value.trim();
        if (keyword) {
            const updatedData = generateMockTrendsData(keyword);
            updateChart(updatedData);
        }
    }
}

function generatePredictions(historical, interval, now) {
    const prediction = [];
    const lastValue = historical.length > 0 ? historical[historical.length - 1].y : 50;
    const predictionStartDate = new Date(now);
    
    // Move to next interval after current date
    if (interval === 'month') {
        predictionStartDate.setMonth(predictionStartDate.getMonth() + 1);
    } else if (interval === 'quarter') {
        predictionStartDate.setMonth(predictionStartDate.getMonth() + 3);
    } else {
        predictionStartDate.setFullYear(predictionStartDate.getFullYear() + 1);
    }
    
    let predictionDate = new Date(predictionStartDate);
    const maxPeriods = interval === 'month' ? predictionMonths : 
                      (interval === 'quarter' ? Math.ceil(predictionMonths / 3) : 
                       Math.ceil(predictionMonths / 12));
    const predictionPeriods = Math.min(maxPeriods, 60);
    
    for (let i = 0; i < predictionPeriods; i++) {
        const monthsFromNow = (predictionDate - now) / (30.44 * 24 * 60 * 60 * 1000);
        
        // Apply trend with some randomness
        const seasonal = Math.sin((monthsFromNow / 12) * 2 * Math.PI) * 10;
        const trend = monthsFromNow * 0.15;
        const noise = (Math.random() - 0.5) * 15;
        
        let value = lastValue + seasonal + trend + noise;
        value = Math.max(5, Math.min(95, value));
        
        prediction.push({
            x: predictionDate.toISOString().split('T')[0],
            y: Math.round(value)
        });
        
        // Move to next prediction point
        if (interval === 'month') {
            predictionDate.setMonth(predictionDate.getMonth() + 1);
        } else if (interval === 'quarter') {
            predictionDate.setMonth(predictionDate.getMonth() + 3);
        } else {
            predictionDate.setFullYear(predictionDate.getFullYear() + 1);
        }
    }
    
    return prediction;
}

// ------------------------------
// Upload CSV/XLSX -> Chart.js
// ------------------------------

async function handleDataFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
        setUploadHint(`Loading: ${file.name} ...`);

        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let parsed;

        if (ext === 'csv') {
            parsed = await parseCsvFile(file);
        } else if (ext === 'xlsx' || ext === 'xls') {
            parsed = await parseXlsxFile(file);
        } else {
            throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
        }

        const columns = parsed.columns;
        const rows = parsed.rows;

        if (!columns.length || !rows.length) {
            throw new Error('No usable data found. Make sure your file has a header row and at least one data row.');
        }

        const { numericColumns, categoricalColumns } = inferColumnTypes(rows, columns);
        uploadedFileData = { rows, columns, numericColumns, categoricalColumns };

        populateUploadColumnSelectors(uploadedFileData);
        enableUploadControls(true);
        updateAggregationVisibility();

        setUploadHint(`Loaded: ${file.name} • ${rows.length} rows • ${columns.length} columns`);

        // Auto-render with auto-picked columns
        renderUploadedChartFromUI();
    } catch (err) {
        console.error(err);
        clearUploadedChart();
        setUploadHint('Upload a .csv or .xlsx file to generate a chart.');
        showErrorModal(err && err.message ? err.message : 'Failed to parse file.');
    }
}

function enableUploadControls(enabled) {
    const xSelect = document.getElementById('x-column');
    const ySelect = document.getElementById('y-column');
    const renderBtn = document.getElementById('render-upload-chart');
    const downloadBtn = document.getElementById('download-upload-chart');
    const clearBtn = document.getElementById('clear-upload-chart');

    if (xSelect) xSelect.disabled = !enabled;
    if (ySelect) ySelect.disabled = !enabled;
    if (renderBtn) renderBtn.disabled = !enabled;

    // Download becomes available only after we actually rendered a chart
    if (downloadBtn) downloadBtn.disabled = !uploadedChart;

    if (clearBtn) clearBtn.disabled = !enabled;
}

function setUploadHint(text) {
    const hint = document.getElementById('data-file-hint');
    if (hint) hint.textContent = text;
}

function updateAggregationVisibility() {
    const chartType = getSelectedValue('chart-type');
    const control = document.getElementById('aggregation-control');

    if (!control) return;
    control.style.display = (chartType === 'pie' || chartType === 'doughnut') ? 'block' : 'none';
}

function getSelectedValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
        if (!window.Papa) {
            reject(new Error('PapaParse failed to load.')); 
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
                if (results.errors && results.errors.length) {
                    reject(new Error(results.errors[0].message || 'CSV parse error'));
                    return;
                }

                const rows = (results.data || []).filter(r => r && Object.keys(r).length > 0);
                const columns = (results.meta && results.meta.fields) ? results.meta.fields.filter(Boolean) : inferColumnsFromRows(rows);
                resolve({ rows, columns });
            },
            error: (err) => reject(err)
        });
    });
}

function parseXlsxFile(file) {
    return new Promise((resolve, reject) => {
        if (!window.XLSX) {
            reject(new Error('SheetJS (xlsx) failed to load.'));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.onload = () => {
            try {
                const data = new Uint8Array(reader.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames && workbook.SheetNames[0];

                if (!sheetName) {
                    resolve({ rows: [], columns: [] });
                    return;
                }

                const ws = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
                const columns = inferColumnsFromRows(rows);

                resolve({ rows, columns });
            } catch (e) {
                reject(e);
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

function inferColumnsFromRows(rows) {
    const set = new Set();
    (rows || []).forEach(r => {
        if (!r) return;
        Object.keys(r).forEach(k => set.add(k));
    });
    return Array.from(set);
}

function inferColumnTypes(rows, columns) {
    const numericColumns = [];
    const categoricalColumns = [];

    for (const col of columns) {
        let numericCount = 0;
        let nonEmptyCount = 0;

        for (const row of rows) {
            const raw = row ? row[col] : null;
            if (raw === null || raw === undefined || raw === '') continue;
            nonEmptyCount++;

            const n = coerceNumber(raw);
            if (Number.isFinite(n)) numericCount++;
        }

        // If column is mostly numeric, treat as numeric
        const numericRatio = nonEmptyCount === 0 ? 0 : numericCount / nonEmptyCount;
        if (numericRatio >= 0.7) numericColumns.push(col);
        else categoricalColumns.push(col);
    }

    return { numericColumns, categoricalColumns };
}

function coerceNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;

    const trimmed = value.trim();
    if (!trimmed) return NaN;

    // Remove common thousands separators
    const normalized = trimmed.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
}

function isDateLike(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return false;

    const s = String(value).trim();
    if (!s) return false;

    const t = Date.parse(s);
    return !Number.isNaN(t);
}

function populateUploadColumnSelectors(fileData) {
    const xSelect = document.getElementById('x-column');
    const ySelect = document.getElementById('y-column');

    if (!xSelect || !ySelect) return;

    const { columns, numericColumns, categoricalColumns } = fileData;

    // Auto-pick: first categorical for X, first numeric for Y
    const autoX = categoricalColumns[0] || columns[0] || '';
    const autoY = numericColumns[0] || (columns.length > 1 ? columns[1] : columns[0]) || '';

    setSelectOptions(xSelect, columns, autoX);
    setSelectOptions(ySelect, columns, autoY);
}

function setSelectOptions(selectEl, options, selectedValue) {
    selectEl.innerHTML = '';

    for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        selectEl.appendChild(o);
    }

    if (selectedValue && options.includes(selectedValue)) {
        selectEl.value = selectedValue;
    }
}

function clearUploadedChart() {
    if (uploadedChart) {
        uploadedChart.destroy();
        uploadedChart = null;
    }

    uploadedFileData = null;
    enableUploadControls(false);

    const xSelect = document.getElementById('x-column');
    const ySelect = document.getElementById('y-column');

    if (xSelect) {
        xSelect.innerHTML = '<option value="">Upload a file first</option>';
        xSelect.value = '';
    }

    if (ySelect) {
        ySelect.innerHTML = '<option value="">Upload a file first</option>';
        ySelect.value = '';
    }

    const container = document.getElementById('upload-chart-container');
    if (container) container.style.display = 'none';
}

function renderUploadedChartFromUI() {
    if (!uploadedFileData) return;

    const chartType = getSelectedValue('chart-type') || 'line';
    const xCol = getSelectedValue('x-column');
    const yCol = getSelectedValue('y-column');
    const aggregation = getSelectedValue('aggregation') || 'sum';

    if (!xCol || !yCol) return;

    renderUploadedChart({
        rows: uploadedFileData.rows,
        columns: uploadedFileData.columns,
        chartType,
        xCol,
        yCol,
        aggregation
    });
}

function renderUploadedChart({ rows, chartType, xCol, yCol, aggregation }) {
    const canvas = document.getElementById('uploadChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (uploadedChart) {
        uploadedChart.destroy();
        uploadedChart = null;
    }

    const MAX_POINTS = 500;

    const safeRows = (rows || []).filter(r => r && (r[xCol] !== undefined || r[yCol] !== undefined));

    let config;

    if (chartType === 'pie' || chartType === 'doughnut') {
        const grouped = groupAndAggregate(safeRows, xCol, yCol, aggregation);
        const labels = grouped.labels;
        const values = grouped.values;

        config = {
            type: chartType,
            data: {
                labels,
                datasets: [
                    {
                        label: `${yCol} (${aggregation})`,
                        data: values,
                        backgroundColor: buildPalette(labels.length),
                        borderColor: 'rgba(255, 255, 255, 0.9)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        };
    } else if (chartType === 'scatter') {
        const points = [];
        for (const r of safeRows) {
            if (points.length >= MAX_POINTS) break;
            const x = coerceNumber(r[xCol]);
            const y = coerceNumber(r[yCol]);
            if (!Number.isFinite(y)) continue;

            // If X isn't numeric, use row index
            points.push({
                x: Number.isFinite(x) ? x : points.length,
                y
            });
        }

        config = {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: `${yCol} vs ${xCol}`,
                        data: points,
                        backgroundColor: 'rgba(246, 114, 128, 0.6)',
                        borderColor: 'rgba(246, 114, 128, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: xCol } },
                    y: { title: { display: true, text: yCol }, beginAtZero: true }
                }
            }
        };
    } else {
        // line / bar
        const sampleRows = safeRows.slice(0, MAX_POINTS);

        // detect date-like X
        const dateLikeCount = sampleRows.slice(0, Math.min(30, sampleRows.length)).filter(r => isDateLike(r[xCol])).length;
        const useTimeScale = dateLikeCount >= 10;

        if (useTimeScale) {
            const points = [];
            for (const r of sampleRows) {
                const y = coerceNumber(r[yCol]);
                if (!Number.isFinite(y)) continue;
                const xRaw = r[xCol];
                if (!isDateLike(xRaw)) continue;

                points.push({ x: String(xRaw), y });
            }

            config = {
                type: chartType,
                data: {
                    datasets: [
                        {
                            label: yCol,
                            data: points,
                            borderColor: '#f67280',
                            backgroundColor: chartType === 'bar' ? 'rgba(246, 114, 128, 0.35)' : 'rgba(246, 114, 128, 0.15)',
                            borderWidth: 2,
                            fill: chartType !== 'bar',
                            tension: 0.25,
                            pointRadius: points.length > 120 ? 1 : 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: { unit: 'month' },
                            title: { display: true, text: xCol }
                        },
                        y: { beginAtZero: true, title: { display: true, text: yCol } }
                    }
                }
            };
        } else {
            const labels = [];
            const values = [];

            for (const r of sampleRows) {
                const y = coerceNumber(r[yCol]);
                if (!Number.isFinite(y)) continue;
                labels.push(String(r[xCol] ?? ''));
                values.push(y);
            }

            config = {
                type: chartType,
                data: {
                    labels,
                    datasets: [
                        {
                            label: yCol,
                            data: values,
                            borderColor: '#f67280',
                            backgroundColor: chartType === 'bar' ? 'rgba(246, 114, 128, 0.35)' : 'rgba(246, 114, 128, 0.15)',
                            borderWidth: 2,
                            fill: chartType !== 'bar',
                            tension: 0.25,
                            pointRadius: values.length > 120 ? 1 : 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: xCol } },
                        y: { beginAtZero: true, title: { display: true, text: yCol } }
                    }
                }
            };
        }
    }

    uploadedChart = new Chart(ctx, config);

    const container = document.getElementById('upload-chart-container');
    if (container) container.style.display = 'block';

    // Enable download after render
    enableUploadControls(true);
}

function groupAndAggregate(rows, xCol, yCol, aggregation) {
    const map = new Map();
    const counts = new Map();

    for (const r of rows) {
        const key = String(r[xCol] ?? '').trim() || '(blank)';
        const y = coerceNumber(r[yCol]);

        if (!map.has(key)) {
            map.set(key, 0);
            counts.set(key, 0);
        }

        counts.set(key, (counts.get(key) || 0) + 1);

        if (aggregation === 'count') {
            map.set(key, counts.get(key));
        } else if (Number.isFinite(y)) {
            map.set(key, (map.get(key) || 0) + y);
        }
    }

    if (aggregation === 'avg') {
        for (const [k, sum] of map.entries()) {
            const c = counts.get(k) || 1;
            map.set(k, sum / c);
        }
    }

    // Sort descending and keep top N (to prevent unreadable pie charts)
    const entries = Array.from(map.entries()).sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const TOP = 20;

    const top = entries.slice(0, TOP);
    const rest = entries.slice(TOP);

    const labels = top.map(([k]) => k);
    const values = top.map(([, v]) => roundNice(v));

    if (rest.length) {
        const other = rest.reduce((sum, [, v]) => sum + (Number.isFinite(v) ? v : 0), 0);
        labels.push('Other');
        values.push(roundNice(other));
    }

    return { labels, values };
}

function roundNice(n) {
    if (!Number.isFinite(n)) return 0;
    // keep small decimals readable
    return Math.round(n * 100) / 100;
}

function downloadUploadedChart() {
    if (!uploadedChart) return;

    const link = document.createElement('a');
    link.download = 'uploaded-chart.png';
    link.href = uploadedChart.toBase64Image();
    link.click();
}

function buildPalette(n) {
    const base = [
        '#f67280', '#c06c84', '#6c5b7b', '#355c7d',
        '#99b898', '#feceab', '#ff847c', '#e84a5f',
        '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'
    ];

    const colors = [];
    for (let i = 0; i < n; i++) {
        colors.push(base[i % base.length]);
    }
    return colors;
}
