import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

// Define interface for incident data with additional fields from report.tsx
interface Incident {
  lat: number;
  lng: number;
  weight: number;
  type: string;
  description: string;
  timestamp: Date;
  severity: string;
  locationName?: string;
}

// Define filter structure
interface Filters {
  types: string[];
  severity: string[];
  timeRange: string;
}

export default function HeatmapScreen() {
  // Add proper typing to the state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Filters>({
    types: [],
    severity: [],
    timeRange: 'all'
  });
  
  // Get all available incident types from data
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchIncidents();
  }, []);
  
  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [incidents, activeFilters]);

  async function fetchIncidents() {
    try {
      setLoading(true);
      const incidentsCollection = collection(db, 'incidentReports');
      const incidentsSnapshot = await getDocs(incidentsCollection);
      
      console.log(`Fetched ${incidentsSnapshot.docs.length} incident reports`);
      
      // Extract all unique incident types to populate filter options
      const types = new Set<string>();
      
      const incidentData = incidentsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          
          // Debug log
          console.log(`Processing incident: ${doc.id}`, 
            data.location ? `lat: ${data.location.latitude}, lng: ${data.location.longitude}` : 'No location');
          
          // Skip if no location data
          if (!data.location || !data.location.latitude || !data.location.longitude) {
            return null;
          }
          
          // Add to available types for filters
          if (data.type) types.add(data.type);
          
          // Get severity weight based on severity value from report
          let weight = 0.3; // Default low
          let severityValue = data.severity?.toLowerCase() || 'low';
          
          switch (severityValue) {
            case 'critical':
              weight = 1.0;
              break;
            case 'high':
              weight = 0.8;
              break;
            case 'medium':
              weight = 0.5;
              break;
            case 'low':
              weight = 0.3;
              break;
            default:
              weight = 0.3;
          }
          
          return {
            lat: data.location.latitude,
            lng: data.location.longitude,
            weight: weight,
            type: data.type || 'Unknown',
            description: data.description || '',
            timestamp: data.timestamp?.toDate?.() || new Date(),
            severity: data.severity || 'Low',
            locationName: data.location?.locationName
          };
        })
        .filter(Boolean) as Incident[]; // Type assertion to ensure non-null values
      
      console.log(`Created ${incidentData.length} valid heatmap points`);
      setAvailableTypes(Array.from(types));
      setIncidents(incidentData);
      setFilteredIncidents(incidentData); // Start with all incidents
      
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  }
  
  // Function to apply filters
  const applyFilters = () => {
    let result = [...incidents];
    
    // Filter by type if any types are selected
    if (activeFilters.types.length > 0) {
      result = result.filter(incident => 
        activeFilters.types.includes(incident.type)
      );
    }
    
    // Filter by severity if any severities are selected
    if (activeFilters.severity.length > 0) {
      result = result.filter(incident => 
        activeFilters.severity.includes(incident.severity)
      );
    }
    
    // Filter by time range
    if (activeFilters.timeRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (activeFilters.timeRange) {
        case 'day':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      result = result.filter(incident => incident.timestamp >= cutoffDate);
    }
    
    setFilteredIncidents(result);
  };

  // Toggle filter for type
  const toggleTypeFilter = (type: string) => {
    setActiveFilters(prev => {
      const types = prev.types.includes(type) 
        ? prev.types.filter(t => t !== type) 
        : [...prev.types, type];
      return { ...prev, types };
    });
  };
  
  // Toggle filter for severity
  const toggleSeverityFilter = (severity: string) => {
    setActiveFilters(prev => {
      const severities = prev.severity.includes(severity) 
        ? prev.severity.filter(s => s !== severity) 
        : [...prev.severity, severity];
      return { ...prev, severity: severities };
    });
  };
  
  // Set time range filter
  const setTimeRangeFilter = (timeRange: string) => {
    setActiveFilters(prev => ({ ...prev, timeRange }));
  };

  // Create HTML with the heatmap
  const generateHeatmapHTML = () => {
    // Convert incidents to a format the heatmap can use
    const heatData = filteredIncidents.map(inc => {
      return [inc.lat, inc.lng, inc.weight];
    });

    // For debugging, log the data
    console.log("Heatmap data points:", heatData.length);
    
    // Stringified version for injection into HTML
    const points = JSON.stringify(heatData);
    
    // Check if we have any incidents, if not use a default center
    const defaultCenter = [28.6139, 77.2090]; // New Delhi
    const mapCenter = filteredIncidents.length > 0 
      ? [filteredIncidents[0].lat, filteredIncidents[0].lng]
      : defaultCenter;
      
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Safety Heatmap</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
          .legend {
            padding: 10px;
            background: white;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
          }
          .legend-item {
            margin-bottom: 5px;
          }
          .color-box {
            display: inline-block;
            width: 15px;
            height: 15px;
            margin-right: 5px;
          }
          .marker-cluster {
            background-color: rgba(241, 128, 23, 0.6);
            border-radius: 50%;
            text-align: center;
            color: white;
            font-weight: bold;
            border: 1px solid #f18017;
          }
          .incident-popup {
            max-width: 250px;
          }
          .incident-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .incident-info {
            font-size: 14px;
            margin-bottom: 3px;
          }
          .incident-description {
            font-style: italic;
            margin-top: 5px;
          }
          .severity-tag {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 12px;
            margin-left: 5px;
            color: white;
          }
          .severity-Low {
            background-color: #3388ff;
          }
          .severity-Medium {
            background-color: #ff9800;
          }
          .severity-High {
            background-color: #ff5722;
          }
          .severity-Critical {
            background-color: #f44336;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Debug output in the console
          console.log("Received data points: ", ${points}.length);
          
          // Initialize map centered on first incident or default
          const map = L.map('map').setView([${mapCenter[0]}, ${mapCenter[1]}], 13);

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);

          // Create and add the heatmap layer
          const points = ${points};
          
          // Parse incident data for markers
          const incidents = ${JSON.stringify(filteredIncidents)};
          
          // Add markers with improved popups
          incidents.forEach(incident => {
            // Format the date
            const date = new Date(incident.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + 
                                  date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Create marker with popup
            const marker = L.marker([incident.lat, incident.lng])
              .addTo(map);
              
            // Get severity class
            const severityClass = "severity-" + incident.severity;
            
            // Create popup content
            const popupContent = \`
              <div class="incident-popup">
                <div class="incident-title">\${incident.type} 
                  <span class="severity-tag \${severityClass}">\${incident.severity}</span>
                </div>
                <div class="incident-info">
                  <strong>Location:</strong> \${incident.locationName || 'Unknown location'}
                </div>
                <div class="incident-info">
                  <strong>Time:</strong> \${formattedDate}
                </div>
                <div class="incident-description">\${incident.description}</div>
              </div>
            \`;
            
            marker.bindPopup(popupContent);
          });
          
          // Only add heatmap if we have points
          if (points && points.length > 0) {
            const heat = L.heatLayer(points, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: {
                0.2: 'blue',
                0.4: 'lime',
                0.6: 'yellow',
                0.8: 'orange',
                1.0: 'red'
              }
            }).addTo(map);
          } else {
            console.error("No heatmap points available");
            
            // Add a message if no data
            if (!incidents.length) {
              const messageDiv = document.createElement('div');
              messageDiv.innerHTML = '<strong>No incidents match the selected filters</strong>';
              messageDiv.style.position = 'absolute';
              messageDiv.style.top = '10px';
              messageDiv.style.left = '50%';
              messageDiv.style.transform = 'translateX(-50%)';
              messageDiv.style.backgroundColor = 'white';
              messageDiv.style.padding = '10px';
              messageDiv.style.borderRadius = '5px';
              messageDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
              document.body.appendChild(messageDiv);
              
              // Remove after 5 seconds
              setTimeout(() => {
                messageDiv.remove();
              }, 5000);
            }
          }

          // Add a legend
          const legend = L.control({ position: 'bottomright' });
          legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML += '<div class="legend-title"><strong>Incident Severity</strong></div>';
            div.innerHTML += '<div class="legend-item"><span class="color-box" style="background: blue;"></span>Low</div>';
            div.innerHTML += '<div class="legend-item"><span class="color-box" style="background: lime;"></span>Medium</div>';
            div.innerHTML += '<div class="legend-item"><span class="color-box" style="background: yellow;"></span>High</div>';
            div.innerHTML += '<div class="legend-item"><span class="color-box" style="background: orange;"></span>Very High</div>';
            div.innerHTML += '<div class="legend-item"><span class="color-box" style="background: red;"></span>Critical</div>';
            return div;
          };
          legend.addTo(map);
          
          // Send message back to React Native
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'mapLoaded',
            count: incidents.length
          }));
        </script>
      </body>
      </html>
    `;
  };

  // Render filters UI
  const renderFilters = () => {
    if (!showFilters) return null;
    
    const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
    const timeRanges = [
      {id: 'all', label: 'All Time'},
      {id: 'day', label: 'Last 24hrs'},
      {id: 'week', label: 'Past Week'},
      {id: 'month', label: 'Past Month'},
      {id: 'year', label: 'Past Year'},
    ];
    
    return (
      <View style={[styles.filtersContainer, isDark && styles.darkFiltersContainer]}>
        <Text style={[styles.filterTitle, isDark && styles.darkText]}>Incident Types</Text>
        <View style={styles.filterChips}>
          {availableTypes.map(type => (
            <TouchableOpacity 
              key={type}
              style={[
                styles.filterChip, 
                activeFilters.types.includes(type) && styles.activeFilterChip,
                isDark && styles.darkFilterChip,
                activeFilters.types.includes(type) && isDark && styles.darkActiveFilterChip,
              ]}
              onPress={() => toggleTypeFilter(type)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilters.types.includes(type) && styles.activeFilterChipText,
                isDark && styles.darkFilterChipText
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.filterTitle, isDark && styles.darkText]}>Severity</Text>
        <View style={styles.filterChips}>
          {severityLevels.map(severity => (
            <TouchableOpacity 
              key={severity}
              style={[
                styles.filterChip, 
                activeFilters.severity.includes(severity) && styles.activeFilterChip,
                isDark && styles.darkFilterChip,
                activeFilters.severity.includes(severity) && isDark && styles.darkActiveFilterChip,
              ]}
              onPress={() => toggleSeverityFilter(severity)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilters.severity.includes(severity) && styles.activeFilterChipText,
                isDark && styles.darkFilterChipText
              ]}>
                {severity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.filterTitle, isDark && styles.darkText]}>Time Period</Text>
        <View style={styles.filterChips}>
          {timeRanges.map(range => (
            <TouchableOpacity 
              key={range.id}
              style={[
                styles.filterChip, 
                activeFilters.timeRange === range.id && styles.activeFilterChip,
                isDark && styles.darkFilterChip,
                activeFilters.timeRange === range.id && isDark && styles.darkActiveFilterChip,
              ]}
              onPress={() => setTimeRangeFilter(range.id)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilters.timeRange === range.id && styles.activeFilterChipText,
                isDark && styles.darkFilterChipText
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={[styles.resetButton, isDark && styles.darkResetButton]}
          onPress={() => setActiveFilters({types: [], severity: [], timeRange: 'all'})}
        >
          <Text style={styles.resetButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'mapLoaded') {
        console.log(`Map loaded with ${message.count} incidents`);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color={isDark ? "#9C27B0" : "#673AB7"} />
        <Text style={[styles.loadingText, isDark && styles.darkText]}>
          Building safety heatmap...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <TouchableOpacity 
        style={[styles.filterButton, isDark && styles.darkFilterButton]} 
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name={showFilters ? "close" : "filter"} size={24} color={isDark ? "#fff" : "#000"} />
        <Text style={[styles.filterButtonText, isDark && styles.darkText]}>
          {showFilters ? "Close" : "Filters"}
        </Text>
      </TouchableOpacity>
      
      {renderFilters()}
      
      <View style={styles.webviewContainer}>
        <WebView
          source={{ html: generateHeatmapHTML() }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
        />
      </View>
      
      <View style={[styles.statsBar, isDark && styles.darkStatsBar]}>
        <Text style={[styles.statsText, isDark && styles.darkText]}>
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  filterButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 10,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  darkFilterButton: {
    backgroundColor: '#333',
  },
  filterButtonText: {
    marginLeft: 5,
    fontWeight: '600',
    color: '#000',
  },
  filtersContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    zIndex: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    maxHeight: '70%',
  },
  darkFiltersContainer: {
    backgroundColor: '#333',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  darkFilterChip: {
    backgroundColor: '#444',
    borderColor: '#555',
  },
  activeFilterChip: {
    backgroundColor: '#673AB7',
    borderColor: '#673AB7',
  },
  darkActiveFilterChip: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  filterChipText: {
    color: '#666',
    fontSize: 14,
  },
  darkFilterChipText: {
    color: '#eee',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#FF5722',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  darkResetButton: {
    backgroundColor: '#F44336',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsBar: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkStatsBar: {
    backgroundColor: '#222',
    borderTopColor: '#444',
  },
  statsText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#666',
  }
});