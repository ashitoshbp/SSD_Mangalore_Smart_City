import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Pie, Bar, Line, Doughnut, PolarArea } from 'react-chartjs-2';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  RadialLinearScale,
  Filler
);

const Dashboard = () => {
  // State for dashboard data
  const [kpiData, setKpiData] = useState(null);
  const [temporalData, setTemporalData] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [incidentDetails, setIncidentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('day');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [kpiResponse, temporalResponse, breakdownResponse, responseResponse, detailsResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/dashboard/kpi'),
          axios.get('http://localhost:5000/api/dashboard/temporal'),
          axios.get('http://localhost:5000/api/dashboard/breakdown'),
          axios.get('http://localhost:5000/api/dashboard/response'),
          axios.get('http://localhost:5000/api/dashboard/details', {
            params: { page: currentPage, page_size: 10 }
          })
        ]);
        
        setKpiData(kpiResponse.data);
        setTemporalData(temporalResponse.data);
        setBreakdownData(breakdownResponse.data);
        setResponseData(responseResponse.data);
        setIncidentDetails(detailsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentPage]);

  // Handle page change for incident details
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Handle time range change for temporal data
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Handle incident selection for details view
  const handleIncidentSelect = (incident) => {
    setSelectedIncident(incident);
  };

  // Close incident details modal
  const closeIncidentDetails = () => {
    setSelectedIncident(null);
  };

  // Get temporal data based on selected time range
  const getTemporalChartData = () => {
    if (!temporalData) return null;
    
    // Add debug logging to see what data we're receiving
    console.log('Temporal data received:', temporalData);
    
    let data = [];
    let labels = [];
    
    // Check for both old and new API response formats
    switch(timeRange) {
      case 'day':
        // Handle both old and new API response formats
        if (temporalData.daily) {
          data = temporalData.daily.map(item => item.count);
          labels = temporalData.daily.map(item => item.date);
        } else if (temporalData.incidents_per_day) {
          data = temporalData.incidents_per_day.map(item => item.count);
          labels = temporalData.incidents_per_day.map(item => item.date);
        }
        break;
      case 'week':
        // Handle both old and new API response formats
        if (temporalData.weekly) {
          data = temporalData.weekly.map(item => item.count);
          labels = temporalData.weekly.map(item => item.year_week);
        } else if (temporalData.incidents_per_week) {
          data = temporalData.incidents_per_week.map(item => item.count);
          labels = temporalData.incidents_per_week.map(item => item.year_week);
        }
        break;
      case 'month':
        // Handle both old and new API response formats
        if (temporalData.monthly) {
          data = temporalData.monthly.map(item => item.count);
          labels = temporalData.monthly.map(item => item.year_month);
        } else if (temporalData.incidents_per_month) {
          data = temporalData.incidents_per_month.map(item => item.count);
          labels = temporalData.incidents_per_month.map(item => item.year_month);
        }
        break;
      default:
        // Handle both old and new API response formats for the default case
        if (temporalData.daily) {
          data = temporalData.daily.map(item => item.count);
          labels = temporalData.daily.map(item => item.date);
        } else if (temporalData.incidents_per_day) {
          data = temporalData.incidents_per_day.map(item => item.count);
          labels = temporalData.incidents_per_day.map(item => item.date);
        }
        break;
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Incidents',
          data,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3498db',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Mangalore Smart City Incident Dashboard</h1>
        <p className="dashboard-subtitle">Real-time monitoring and analytics of city incidents</p>
      </header>
      
      {/* KPI Panel Section */}
      <section className="dashboard-section kpi-section">
        <h2 className="section-title">Overview</h2>
        <div className="kpi-cards">
          <div className="kpi-card total-incidents">
            <div className="kpi-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="kpi-content">
              <h3>Total Incidents</h3>
              <div className="kpi-value">{kpiData?.total_incidents || 0}</div>
            </div>
          </div>
          
          <div className="kpi-card resolved-incidents">
            <div className="kpi-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="kpi-content">
              <h3>Resolved</h3>
              <div className="kpi-value">{kpiData?.resolved_incidents || 0}</div>
              <div className="kpi-subtext">{kpiData ? Math.round((kpiData.resolved_incidents / kpiData.total_incidents) * 100) : 0}% of total</div>
            </div>
          </div>
          
          <div className="kpi-card pending-incidents">
            <div className="kpi-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="kpi-content">
              <h3>Pending</h3>
              <div className="kpi-value">{kpiData?.pending_incidents || 0}</div>
              <div className="kpi-subtext">{kpiData ? Math.round((kpiData.pending_incidents / kpiData.total_incidents) * 100) : 0}% of total</div>
            </div>
          </div>
          
          <div className="kpi-card sla-compliance">
            <div className="kpi-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="kpi-content">
              <h3>SLA Compliance</h3>
              <div className="kpi-value">{kpiData ? Math.round((kpiData.action_sla_rate + kpiData.closure_sla_rate) / 2) : 0}%</div>
              <div className="kpi-subtext">Action: {Math.round(kpiData?.action_sla_rate || 0)}% | Closure: {Math.round(kpiData?.closure_sla_rate || 0)}%</div>
            </div>
          </div>
          
          <div className="kpi-card response-time">
            <div className="kpi-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <div className="kpi-content">
              <h3>Avg. Response Time</h3>
              <div className="kpi-value">{kpiData ? Math.round(kpiData.avg_action_time_minutes) : 0} min</div>
              <div className="kpi-subtext">to take action</div>
            </div>
          </div>
          
          <div className="kpi-card resolution-time">
            <div className="kpi-icon">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="kpi-content">
              <h3>Avg. Resolution Time</h3>
              <div className="kpi-value">{kpiData ? Math.round(kpiData.avg_closure_time_minutes) : 0} min</div>
              <div className="kpi-subtext">to close incident</div>
            </div>
          </div>
        </div>
        
        <div className="kpi-charts">
          <div className="kpi-chart-container">
            <h3>Top 5 Incident Types</h3>
            {kpiData && kpiData.top_incident_types && (
              <div className="chart-wrapper">
                <Pie 
                  data={{
                    labels: Object.keys(kpiData.top_incident_types),
                    datasets: [{
                      data: Object.values(kpiData.top_incident_types),
                      backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                      ],
                      borderWidth: 1,
                      hoverOffset: 10
                    }]
                  }}
                  options={{
                    plugins: {
                      legend: {
                        position: 'right',
                      },
                      animation: {
                        animateRotate: true,
                        animateScale: true
                      }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="kpi-chart-container">
            <h3>Top 5 Taluks by Volume</h3>
            {kpiData && kpiData.top_taluks && (
              <div className="chart-wrapper">
                <Bar
                  data={{
                    labels: Object.keys(kpiData.top_taluks),
                    datasets: [{
                      label: 'Incidents',
                      data: Object.values(kpiData.top_taluks),
                      backgroundColor: '#36A2EB',
                      borderColor: '#2980B9',
                      borderWidth: 1,
                    }]
                  }}
                  options={{
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    },
                    animation: {
                      duration: 2000,
                      easing: 'easeOutBounce'
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Temporal Trends Section */}
      <section className="dashboard-section temporal-section">
        <h2 className="section-title">Temporal Trends</h2>
        
        <div className="time-range-selector">
          <button 
            className={timeRange === 'day' ? 'active' : ''} 
            onClick={() => handleTimeRangeChange('day')}
          >
            Daily
          </button>
          <button 
            className={timeRange === 'week' ? 'active' : ''} 
            onClick={() => handleTimeRangeChange('week')}
          >
            Weekly
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''} 
            onClick={() => handleTimeRangeChange('month')}
          >
            Monthly
          </button>
        </div>
        
        <div className="temporal-chart-container">
          {temporalData && (
            <div className="chart-wrapper time-series-chart">
              <Line 
                data={getTemporalChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    title: {
                      display: true,
                      text: `Incidents per ${timeRange}`,
                      font: {
                        size: 16
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Incidents'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: timeRange === 'day' ? 'Date' : timeRange === 'week' ? 'Week' : 'Month'
                      }
                    }
                  },
                  animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                  },
                  interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                  }
                }}
              />
            </div>
          )}
        </div>
        
        <div className="temporal-analysis-container">
          <div className="temporal-analysis-card">
            <h3>Monsoon vs. Non-Monsoon</h3>
            {temporalData && temporalData.monsoon_analysis && (
              <div className="chart-wrapper">
                <Doughnut
                  data={{
                    labels: temporalData.monsoon_analysis.map(item => item.season),
                    datasets: [{
                      data: temporalData.monsoon_analysis.map(item => item.count),
                      backgroundColor: ['#3498db', '#e74c3c'],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="temporal-analysis-card">
            <h3>Hour of Day Distribution</h3>
            {temporalData && temporalData.hour_analysis && (
              <div className="chart-wrapper">
                <Bar
                  data={{
                    labels: temporalData.hour_analysis.map(item => `${item.hour}:00`),
                    datasets: [{
                      label: 'Incidents',
                      data: temporalData.hour_analysis.map(item => item.count),
                      backgroundColor: '#9b59b6',
                      borderColor: '#8e44ad',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      title: {
                        display: true,
                        text: 'Peak Hours',
                        font: {
                          size: 16
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Incidents'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Hour of Day'
                        }
                      }
                    },
                    animation: {
                      duration: 2000,
                      easing: 'easeInOutQuint'
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="temporal-analysis-card">
            <h3>Day of Week Distribution</h3>
            {temporalData && temporalData.day_analysis && (
              <div className="chart-wrapper">
                <PolarArea
                  data={{
                    labels: temporalData.day_analysis.map(item => item.day_name),
                    datasets: [{
                      data: temporalData.day_analysis.map(item => item.count),
                      backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(231, 233, 237, 0.7)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right'
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Incident Breakdown Section */}
      <section className="dashboard-section breakdown-section">
        <h2 className="section-title">Incident Breakdown</h2>
        
        <div className="breakdown-charts">
          <div className="breakdown-chart-container">
            <h3>Incidents by Type</h3>
            {breakdownData && breakdownData.incident_type_breakdown && (
              <div className="chart-wrapper">
                <Pie
                  data={{
                    labels: breakdownData.incident_type_breakdown.map(item => item.type),
                    datasets: [{
                      data: breakdownData.incident_type_breakdown.map(item => item.count),
                      backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#8BC34A', '#EA80FC', '#607D8B', '#FF5252',
                        '#00BCD4', '#FFEB3B', '#673AB7', '#795548', '#3F51B5'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 15,
                          font: {
                            size: 10
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 2000
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="breakdown-chart-container">
            <h3>Information Source</h3>
            {breakdownData && breakdownData.info_source_breakdown && (
              <div className="chart-wrapper">
                <Bar
                  data={{
                    labels: breakdownData.info_source_breakdown.slice(0, 10).map(item => item.source),
                    datasets: [{
                      label: 'Count',
                      data: breakdownData.info_source_breakdown.slice(0, 10).map(item => item.count),
                      backgroundColor: '#2ecc71',
                      borderColor: '#27ae60',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      title: {
                        display: true,
                        text: 'Top 10 Information Sources',
                        font: {
                          size: 14
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    },
                    animation: {
                      duration: 2000,
                      easing: 'easeInOutQuad'
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="breakdown-chart-container">
            <h3>Channel Distribution</h3>
            {breakdownData && breakdownData.channel_breakdown && (
              <div className="chart-wrapper">
                <Doughnut
                  data={{
                    labels: breakdownData.channel_breakdown.map(item => item.channel),
                    datasets: [{
                      data: breakdownData.channel_breakdown.map(item => item.count),
                      backgroundColor: [
                        '#3498db', '#e74c3c', '#f1c40f', '#9b59b6'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 2000
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Response & Closure Analytics Section */}
      <section className="dashboard-section response-section">
        <h2 className="section-title">Response & Closure Analytics</h2>
        
        <div className="response-charts">
          <div className="response-chart-container">
            <h3>Response Time Distribution</h3>
            {responseData && responseData.action_time_distribution && (
              <div className="chart-wrapper">
                <Bar
                  data={{
                    labels: Array.from({ length: 10 }, (_, i) => {
                      const min = Math.floor(i * 60);
                      const max = Math.floor((i + 1) * 60 - 1);
                      return `${min}-${max} min`;
                    }),
                    datasets: [{
                      label: 'Frequency',
                      data: Array.from({ length: 10 }, (_, i) => {
                        const min = i * 60;
                        const max = (i + 1) * 60;
                        return responseData.action_time_distribution.data.filter(
                          time => time >= min && time < max
                        ).length;
                      }),
                      backgroundColor: '#3498db',
                      borderColor: '#2980b9',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          title: function(tooltipItems) {
                            return tooltipItems[0].label;
                          },
                          label: function(context) {
                            return `Incidents: ${context.raw}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Incidents'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Time to Take Action'
                        }
                      }
                    },
                    animation: {
                      duration: 2000,
                      easing: 'easeOutQuart'
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="response-chart-container">
            <h3>Closure Time Distribution</h3>
            {responseData && responseData.closure_time_distribution && (
              <div className="chart-wrapper">
                <Bar
                  data={{
                    labels: Array.from({ length: 10 }, (_, i) => {
                      const min = Math.floor(i * 120);
                      const max = Math.floor((i + 1) * 120 - 1);
                      return `${min}-${max} min`;
                    }),
                    datasets: [{
                      label: 'Frequency',
                      data: Array.from({ length: 10 }, (_, i) => {
                        const min = i * 120;
                        const max = (i + 1) * 120;
                        return responseData.closure_time_distribution.data.filter(
                          time => time >= min && time < max
                        ).length;
                      }),
                      backgroundColor: '#e74c3c',
                      borderColor: '#c0392b',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          title: function(tooltipItems) {
                            return tooltipItems[0].label;
                          },
                          label: function(context) {
                            return `Incidents: ${context.raw}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Incidents'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Time to Close'
                        }
                      }
                    },
                    animation: {
                      duration: 2000,
                      easing: 'easeOutQuart'
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="outliers-container">
          <div className="outlier-card">
            <h3>Response Time Outliers</h3>
            <div className="outlier-content">
              <div className="outlier-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="outlier-info">
                <p>Slowest 1% threshold: <span>{responseData ? Math.round(responseData.action_time_distribution.outlier_threshold) : 0} minutes</span></p>
                <p>Number of outliers: <span>{responseData ? responseData.action_time_distribution.outlier_count : 0}</span></p>
              </div>
            </div>
          </div>
          
          <div className="outlier-card">
            <h3>Closure Time Outliers</h3>
            <div className="outlier-content">
              <div className="outlier-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="outlier-info">
                <p>Slowest 1% threshold: <span>{responseData ? Math.round(responseData.closure_time_distribution.outlier_threshold) : 0} minutes</span></p>
                <p>Number of outliers: <span>{responseData ? responseData.closure_time_distribution.outlier_count : 0}</span></p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="leaderboard-container">
          <h3>Officer Leaderboard</h3>
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Officer</th>
                  <th>Incidents Closed</th>
                  <th>Avg. Closure Time (min)</th>
                </tr>
              </thead>
              <tbody>
                {responseData && responseData.officer_leaderboard && responseData.officer_leaderboard.map((officer, index) => (
                  <tr key={index} className={index < 3 ? 'top-performer' : ''}>
                    <td>{index + 1}</td>
                    <td>{officer['Closed By Officer']}</td>
                    <td>{officer.incidents_closed}</td>
                    <td>{Math.round(officer.avg_closure_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Drill-down Table & Details Section */}
      <section className="dashboard-section details-section">
        <h2 className="section-title">Incident Details</h2>
        
        <div className="details-table-container">
          <table className="details-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Incident Type</th>
                <th>Location</th>
                <th>Taluk</th>
                <th>Reported At</th>
                <th>Status</th>
                <th>Action Time</th>
                <th>Closure Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidentDetails && incidentDetails.incidents && incidentDetails.incidents.map((incident, index) => (
                <tr key={index} className={incident['Closed At'] ? 'resolved-incident' : 'pending-incident'}>
                  <td>{incident['Sl. No.']}</td>
                  <td>{incident['Incident Type']}</td>
                  <td>{incident['Location']}</td>
                  <td>{incident['Taluk']}</td>
                  <td>{new Date(incident['Incident Reported at']).toLocaleString()}</td>
                  <td>{incident['Closed At'] ? 'Resolved' : 'Pending'}</td>
                  <td>{incident['Time taken to take Action'] || 'N/A'}</td>
                  <td>{incident['Time taken to Close'] || 'N/A'}</td>
                  <td>
                    <button 
                      className="details-button"
                      onClick={() => handleIncidentSelect(incident)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="pagination-controls">
          <button 
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {incidentDetails?.pagination?.total_pages || 1}
          </span>
          
          <button 
            className="pagination-button"
            disabled={currentPage === (incidentDetails?.pagination?.total_pages || 1)}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
        
        {/* Incident Details Modal */}
        {selectedIncident && (
          <div className="incident-modal-overlay" onClick={closeIncidentDetails}>
            <div className="incident-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Incident #{selectedIncident['Sl. No.']} Details</h3>
                <button className="close-button" onClick={closeIncidentDetails}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="incident-detail-row">
                  <div className="detail-label">Incident Type:</div>
                  <div className="detail-value">{selectedIncident['Incident Type']}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Location:</div>
                  <div className="detail-value">{selectedIncident['Location']}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Taluk:</div>
                  <div className="detail-value">{selectedIncident['Taluk']}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Reported At:</div>
                  <div className="detail-value">{new Date(selectedIncident['Incident Reported at']).toLocaleString()}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Status:</div>
                  <div className="detail-value status-badge">
                    <span className={selectedIncident['Closed At'] ? 'resolved' : 'pending'}>
                      {selectedIncident['Closed At'] ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Information Source:</div>
                  <div className="detail-value">{selectedIncident['Info_Source']}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Contact Phone:</div>
                  <div className="detail-value">{selectedIncident['Info_Phone']}</div>
                </div>
                
                <hr className="detail-divider" />
                
                <div className="incident-detail-row">
                  <div className="detail-label">Action Taken By:</div>
                  <div className="detail-value">{selectedIncident['Action Taken By'] || 'N/A'}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Action Date/Time:</div>
                  <div className="detail-value">
                    {selectedIncident['Action Date/Time'] ? new Date(selectedIncident['Action Date/Time']).toLocaleString() : 'N/A'}
                  </div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Time to Take Action:</div>
                  <div className="detail-value">{selectedIncident['Time taken to take Action'] || 'N/A'}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Action Remarks:</div>
                  <div className="detail-value remarks">{selectedIncident['Action Remarks'] || 'N/A'}</div>
                </div>
                
                <hr className="detail-divider" />
                
                <div className="incident-detail-row">
                  <div className="detail-label">Closed By:</div>
                  <div className="detail-value">{selectedIncident['Closed By Officer'] || 'N/A'}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Closed At:</div>
                  <div className="detail-value">
                    {selectedIncident['Closed At'] ? new Date(selectedIncident['Closed At']).toLocaleString() : 'N/A'}
                  </div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Time to Close:</div>
                  <div className="detail-value">{selectedIncident['Time taken to Close'] || 'N/A'}</div>
                </div>
                
                <div className="incident-detail-row">
                  <div className="detail-label">Closure Remarks:</div>
                  <div className="detail-value remarks">{selectedIncident['Closed Remarks'] || 'N/A'}</div>
                </div>
                
                {/* Photo section - currently no photos in dataset */}
                <div className="photo-section">
                  <h4>Photos</h4>
                  <p className="no-photos-message">No photos available for this incident.</p>
                  {/* When photos are available, we can implement a before/after slider here */}
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="close-modal-button" onClick={closeIncidentDetails}>Close</button>
              </div>
            </div>
          </div>
        )}
      </section>
      
      {/* Alert & Notification Center */}
      <section className="dashboard-section alerts-section">
        <h2 className="section-title">Alert & Notification Center</h2>
        
        <div className="alerts-container">
          <div className="alert-card">
            <div className="alert-icon warning">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="alert-content">
              <h3>Incident Spike Alert</h3>
              <p>Incidents reported today (25) are above the daily average (18).</p>
              <p className="alert-timestamp">Today, 10:45 AM</p>
            </div>
          </div>
          
          <div className="alert-card">
            <div className="alert-icon critical">
              <i className="fas fa-bell"></i>
            </div>
            <div className="alert-content">
              <h3>Long-Open Incidents</h3>
              <p>3 incidents have been open for more than 48 hours.</p>
              <p className="alert-timestamp">Today, 09:30 AM</p>
            </div>
          </div>
          
          <div className="alert-card">
            <div className="alert-icon info">
              <i className="fas fa-info-circle"></i>
            </div>
            <div className="alert-content">
              <h3>Notification Settings</h3>
              <p>Configure your notification preferences for email and Slack alerts.</p>
              <div className="notification-settings">
                <label>
                  <input type="checkbox" checked /> Email Notifications
                </label>
                <label>
                  <input type="checkbox" checked /> Slack Notifications
                </label>
                <button className="settings-button">Configure</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
