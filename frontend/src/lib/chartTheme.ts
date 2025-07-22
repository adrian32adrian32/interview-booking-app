export const getChartColors = (theme: string | undefined) => {
  switch (theme) {
    case 'dark':
      return {
        textColor: '#e5e7eb',
        gridColor: 'rgba(55, 65, 81, 0.3)',
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        // Culori pentru dataset-uri
        primary: '#60a5fa',
        secondary: '#a78bfa',
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        // Array de culori pentru grafice multiple
        datasetColors: [
          '#60a5fa', // blue-400
          '#a78bfa', // purple-400
          '#34d399', // green-400
          '#fbbf24', // yellow-400
          '#f87171', // red-400
          '#fb923c', // orange-400
        ]
      };
    
    case 'futuristic':
      return {
        textColor: '#bdfffe',
        gridColor: 'rgba(189, 255, 254, 0.1)',
        backgroundColor: 'transparent',
        borderColor: 'rgba(189, 255, 254, 0.2)',
        // Culori pentru dataset-uri
        primary: '#b794f6',
        secondary: '#81e6d9',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
        // Array de culori pentru grafice multiple
        datasetColors: [
          '#b794f6', // purple-400
          '#81e6d9', // teal-300
          '#90cdf4', // blue-300
          '#fde68a', // yellow-200
          '#fca5a5', // red-300
          '#fdba74', // orange-300
        ]
      };
    
    default: // light theme
      return {
        textColor: '#374151',
        gridColor: 'rgba(229, 231, 235, 1)',
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        // Culori pentru dataset-uri
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Array de culori pentru grafice multiple
        datasetColors: [
          '#3b82f6', // blue-500
          '#8b5cf6', // purple-500
          '#10b981', // green-500
          '#f59e0b', // yellow-500
          '#ef4444', // red-500
          '#f97316', // orange-500
        ]
      };
  }
};

// Configurație pentru Chart.js
export const getChartOptions = (theme: string | undefined) => {
  const colors = getChartColors(theme);
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: theme === 'futuristic' ? 'rgba(10, 14, 39, 0.9)' : undefined,
        titleColor: colors.textColor,
        bodyColor: colors.textColor,
        borderColor: colors.borderColor,
        borderWidth: theme === 'futuristic' ? 1 : 0
      }
    },
    scales: {
      x: {
        ticks: {
          color: colors.textColor
        },
        grid: {
          color: colors.gridColor,
          borderColor: colors.borderColor
        }
      },
      y: {
        ticks: {
          color: colors.textColor
        },
        grid: {
          color: colors.gridColor,
          borderColor: colors.borderColor
        }
      }
    }
  };
};