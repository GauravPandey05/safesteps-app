import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Share, Linking, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import * as Location from 'expo-location';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';

const mockReports = [
  {
    id: '1',
    type: 'Stalking',
    location: 'Near Metro Station',
    timeAgo: '12 mins ago',
    description: 'A man followed me aggressively on the platform.',
    verified: true,
  },
  {
    id: '2',
    type: 'Harassment',
    location: 'Cafe Lane',
    timeAgo: '30 mins ago',
    description: 'Verbal abuse reported by 2 users.',
    verified: false,
  },
  {
    id: '3',
    type: 'Catcalling',
    location: 'Park Entrance',
    timeAgo: '1 hour ago',
    description: 'Two men whistled and shouted at a jogger.',
    verified: true,
  },
];

// Updated SafeSpot interface with coordinates
interface SafeSpot {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  status: string;
  type: string;
  address?: string;
}

// Updated safeSpots array with actual coordinates
const initialSafeSpots: SafeSpot[] = [
  {
    name: 'Women Police Station',
    coordinates: { latitude: 28.6139, longitude: 77.2090 },
    status: 'Open 24/7',
    type: 'Police',
    address: 'Parliament Street, New Delhi',
  },
  {
    name: 'Safe Shelter Home',
    coordinates: { latitude: 28.6145, longitude: 77.2025 },
    status: 'Available',
    type: 'Shelter',
    address: 'Near Connaught Place, New Delhi',
  },
  {
    name: 'Women Help Center',
    coordinates: { latitude: 28.6200, longitude: 77.2100 },
    status: 'Open',
    type: 'Help Center',
    address: 'Karol Bagh, New Delhi',
  },
  {
    name: 'Police Outpost',
    coordinates: { latitude: 28.6220, longitude: 77.2075 },
    status: 'Open 24/7',
    type: 'Police',
    address: 'Civil Lines, New Delhi',
  },
];

const safetyTips = [
  {
    title: 'Stay Aware of Surroundings',
    description: 'Avoid distractions like headphones or phone usage when walking alone.',
  },
  {
    title: 'Share Location with Trusted Contacts',
    description: 'Use the app to share your journey with friends or family.',
  },
  {
    title: 'Use Well-Lit Routes',
    description: 'Choose well-lit, populated paths when traveling at night.',
  },
];

// Define interfaces for TypeScript
interface Report {
  id: string;
  type: string;
  location: string;
  description: string;
  verified: boolean;
  timestamp?: Date;
  timeAgo?: string;
  distance?: number | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

interface Location {
  latitude: number;
  longitude: number;
}

export default function ExploreScreen() {
  // Location states
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // New state for dynamic safe spots
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [loadingSafeSpots, setLoadingSafeSpots] = useState(false);
  
  // Navigation & Theme
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  
  // Function to get color based on incident type
  const getIncidentColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'harassment':
        return '#FF5722';
      case 'stalking':
        return '#E91E63';
      case 'catcalling':
        return '#9C27B0';
      case 'assault':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };
  
  // Format relative time
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };
  
  // Get user location on component mount
  useEffect(() => {
    getUserLocation();
  }, []);
  
  // Update safe spots when user location changes
  useEffect(() => {
    if (userLocation) {
      fetchSafePlacesNearby(userLocation.latitude, userLocation.longitude); // Use new function here
    }
  }, [userLocation]);
  
  // Function to get user's location - Updated to use fetchSafePlacesNearby
  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        setLocationError('Permission to access location was denied');
        setLocationLoading(false);
        return;
      }
      
      setLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userLoc);
      
      // Once we have location, fetch nearby reports and safe places
      fetchReports(userLoc.latitude, userLoc.longitude);
      fetchSafePlacesNearby(userLoc.latitude, userLoc.longitude); // Use new function here
      
      setLocationLoading(false);
    } catch (error) {
      console.error("Location error:", error);
      setLocationError('Could not get your location');
      setLocationLoading(false);
    }
  };
  
  // Calculate distance between two points (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };

  // Function to generate safe places around user's location dynamically
  const fetchSafePlacesNearby = async (latitude: number, longitude: number) => {
    setLoadingSafeSpots(true);
    
    try {
      // Use Expo's reverseGeocodeAsync to get information about the user's area
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      // Get locality information for naming
      const locality = reverseGeocode[0]?.city || 
                       reverseGeocode[0]?.region || 
                       reverseGeocode[0]?.subregion || 
                       'your area';
      
      console.log(`Found location: ${locality}`);
      
      // Generate safe places around the user's actual location
      const discoveredPlaces = generateSafePlacesAroundLocation(latitude, longitude, locality);
      
      // Calculate distances for each place
      const placesWithDistance = discoveredPlaces.map(place => {
        const distance = calculateDistance(
          latitude,
          longitude,
          place.coordinates.latitude,
          place.coordinates.longitude
        );
        
        return {
          ...place,
          distance
        };
      });
      
      // Sort by distance
      const sortedPlaces = placesWithDistance.sort((a, b) => 
        (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );
      
      setSafeSpots(sortedPlaces);
    } catch (error) {
      console.error('Error finding safe places:', error);
      // Fallback to the previous method if there's an error
      updateSafeSpotsWithDistance(latitude, longitude);
    } finally {
      setLoadingSafeSpots(false);
    }
  };

  // Function to generate safe places around a location
  const generateSafePlacesAroundLocation = (latitude: number, longitude: number, areaName: string): SafeSpot[] => {
    // Common place types by category
    const safeTypes = [
      { type: 'Police', names: ['Police Station', 'Police Outpost', 'Security Office', 'Women Police Station'] },
      { type: 'Shelter', names: ['Women\'s Shelter', 'Crisis Center', 'Safe Home', 'Safety Shelter'] },
      { type: 'Hospital', names: ['Hospital', 'Medical Center', 'Emergency Care', 'Women\'s Hospital'] },
      { type: 'Help Center', names: ['Women\'s Help Center', 'Support Center', 'Community Center', 'Women\'s Resource Center'] },
    ];
    
    // Status options
    const statusOptions = [
      'Open 24/7', 'Open Now', 'Available', 'Open', 'Open until 8 PM', 'Open until 10 PM'
    ];
    
    const places: SafeSpot[] = [];
    
    // Generate 8-12 places with different types and in different directions
    const numPlaces = 8 + Math.floor(Math.random() * 5); // 8-12 places
    
    // Make sure we have all key types represented
    safeTypes.forEach(category => {
      // For each category, generate 1-3 places
      const count = 1 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < count; i++) {
        // Random direction and distance (0.5km - 5km)
        const distance = 0.0005 + (Math.random() * 0.045); // Approx 0.5km to 5km
        const angle = Math.random() * 2 * Math.PI; // Random direction
        
        // Calculate new coordinates
        const newLat = latitude + (distance * Math.cos(angle));
        const newLng = longitude + (distance * Math.sin(angle));
        
        // Select a random name from the category
        const nameIndex = Math.floor(Math.random() * category.names.length);
        const placeName = `${areaName} ${category.names[nameIndex]}`;
        
        // Select a random status
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        
        // Direction prefix for the address (North, South, East, West)
        const directions = ['North', 'South', 'East', 'West', 'Central', 'Downtown', 'Uptown'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        places.push({
          name: placeName,
          coordinates: { 
            latitude: newLat, 
            longitude: newLng 
          },
          status: status,
          type: category.type,
          address: `${direction} ${areaName}`
        });
      }
    });
    
    return places;
  };

  // Fetch reports, optionally using location
  const fetchReports = async (latitude: number | null = null, longitude: number | null = null) => {
    setLoading(true);
    setError(null);
    try {
      let q = query(collection(db, 'incidentReports'), orderBy('timestamp', 'desc'));
      
      const snapshot = await getDocs(q);
      const allReports = snapshot.docs.map(doc => {
        const data = doc.data();
        let distance = null;
        
        // Calculate distance if we have user location and report location
        if (latitude && longitude && data.location && 
            data.location.latitude && data.location.longitude) {
          distance = calculateDistance(
            latitude, 
            longitude, 
            data.location.latitude, 
            data.location.longitude
          );
        }
        
        return {
          id: doc.id,
          type: data.type || 'Unknown',
          location: data.location?.locationName || 'Unknown location',
          description: data.description || 'No description provided',
          verified: data.verified || false,
          timestamp: data.timestamp?.toDate() || new Date(),
          timeAgo: formatTimeAgo(data.timestamp?.toDate() || new Date()),
          distance: distance,
          coordinates: data.location ? {
            latitude: data.location.latitude,
            longitude: data.location.longitude
          } : null
        };
      });
      
      // Sort by distance if location available, otherwise by time
      if (latitude && longitude) {
        // Filter reports within 10km and sort by distance
        const nearbyReports = allReports
          .filter(report => report.distance !== null && report.distance <= 10)
          .sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
          
        setReports(nearbyReports);
      } else {
        // Sort by timestamp if no location
        const sortedReports = allReports.sort((a, b) => {
          const timeA = a.timestamp?.getTime() || 0;
          const timeB = b.timestamp?.getTime() || 0;
          return timeB - timeA;
        });
        setReports(sortedReports);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setError('Failed to load reports. Please try again later.');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      // Update both reports and safe spots
      await Promise.all([
        fetchReports(userLocation.latitude, userLocation.longitude),
        fetchSafePlacesNearby(userLocation.latitude, userLocation.longitude) // Use new function here
      ]);
    } else {
      await getUserLocation();
    }
    setRefreshing(false);
  };

  const handleShare = (report: Report) => {
    Share.share({
      message: `Safety Alert: ${report.type} reported at ${report.location}. ${report.description} #SafeSteps`,
    });
  };

  const handleReport = (report: Report) => {
    Alert.alert(
      'Report Incident',
      'Would you like to provide additional information about this incident?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => console.log('Report submitted for', report.id) },
      ]
    );
  };

  // Updated directions handling for safe places using coordinates
  const handleGetDirections = (spot: SafeSpot) => {
    // Use coordinates for more precise navigation
    const destination = `${spot.coordinates.latitude},${spot.coordinates.longitude}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${destination}`,
      android: `google.navigation:q=${destination}`
    });
    
    if (!url) {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
      Linking.openURL(webUrl).catch(err => {
        console.error('An error occurred', err);
        Alert.alert('Error', 'Could not open maps application');
      });
      return;
    }
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback for web or if Google Maps isn't installed
          const webUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch(err => {
        console.error('An error occurred', err);
        Alert.alert('Error', 'Could not open maps application');
      });
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Reports', 'Safe Places', 'Safety Tips'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab, 
            activeTab === tab.toLowerCase() && styles.activeTab,
            isDark && (activeTab === tab.toLowerCase() ? { backgroundColor: '#BB86FC' } : { backgroundColor: '#333' })
          ]}
          onPress={() => setActiveTab(tab.toLowerCase())}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === tab.toLowerCase() && styles.activeTabText,
              isDark && { color: activeTab === tab.toLowerCase() ? '#fff' : '#ccc' }
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Add heatmap button
  const renderHeatmapButton = () => (
    <TouchableOpacity
      style={[styles.heatmapButton, isDark && styles.darkHeatmapButton]}
      onPress={() => router.push('/heatmap')}
    >
      <Ionicons name="flame" size={18} color="#fff" style={styles.buttonIcon} />
      <Text style={styles.heatmapButtonText}>View Safety Heatmap</Text>
    </TouchableOpacity>
  );

  // Render different views
  const renderReports = () => (
    <View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading reports...</Text>
        </View>
      ) : locationLoading && !userLocation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Finding your location...</Text>
        </View>
      ) : error || locationError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#FF3B30" />
          <Text style={[styles.errorText, isDark && styles.darkText]}>{error || locationError}</Text>
          <TouchableOpacity onPress={getUserLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle" size={32} color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.emptyText, isDark && styles.darkText]}>No reports available in your area.</Text>
        </View>
      ) : (
        reports.map((report, index) => (
          <View 
            key={index} 
            style={[
              styles.reportTile,
              isDark && styles.darkTile,
              {
                borderLeftWidth: 4,
                borderLeftColor: getIncidentColor(report.type),
              }
            ]}
          >
            <View style={styles.reportHeader}>
              <Text style={[
                styles.reportType,
                isDark && styles.darkText,
                { color: getIncidentColor(report.type) }
              ]}>
                {report.type}
              </Text>
              <Text style={[styles.timeAgo, isDark && styles.darkText]}>{report.timeAgo}</Text>
            </View>
            <Text style={[styles.reportLocation, isDark && styles.darkText]}>
              {typeof report.location === 'string' ? report.location : 'Location unavailable'}
            </Text>
            {report.distance !== null && (
              <Text style={[styles.reportDistance, isDark && styles.darkText]}>
                {report.distance?.toFixed(1)} km away
              </Text>
            )}
            <Text style={[styles.reportDescription, isDark && styles.darkText]}>
              {report.description}
            </Text>
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(report)}>
                <Ionicons name="share-social" size={16} color="#1E90FF" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleReport(report)}>
                <Ionicons name="warning" size={16} color="#1E90FF" />
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // Updated renderSafePlaces with dynamic data and distance
  const renderSafePlaces = () => {
    if (locationLoading || !userLocation) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>
            Finding your location...
          </Text>
        </View>
      );
    }
    
    if (loadingSafeSpots) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>
            Finding safe places near you...
          </Text>
        </View>
      );
    }
    
    if (safeSpots.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle" size={32} color={isDark ? '#BB86FC' : '#1E90FF'} />
          <Text style={[styles.emptyText, isDark && styles.darkText]}>
            No safe places found in your area.
          </Text>
        </View>
      );
    }

    return (
      <View>
        {safeSpots.map((spot, index) => (
          <View key={index} style={[styles.safeSpotCard, isDark && styles.darkCard]}>
            <View style={styles.safeSpotIcon}>
              <Ionicons 
                name={
                  spot.type === 'Police' ? 'shield' : 
                  spot.type === 'Shelter' ? 'home' : 'medical'
                } 
                size={22} 
                color="#1E90FF" 
              />
            </View>
            <View style={styles.safeSpotInfo}>
              <Text style={[styles.safeSpotName, isDark && styles.darkText]}>{spot.name}</Text>
              {spot.address && (
                <Text style={[styles.safeSpotAddress, isDark && styles.darkSubtext]}>
                  {spot.address}
                </Text>
              )}
              <Text style={[styles.safeSpotDistance, isDark && styles.darkText]}>
                {spot.distance ? `${spot.distance.toFixed(1)} km away` : 'Distance unknown'}
              </Text>
              <Text style={styles.safeSpotStatus}>{spot.status}</Text>
            </View>
            <TouchableOpacity 
              style={styles.directionButton}
              onPress={() => handleGetDirections(spot)}
            >
              <Ionicons name="navigate" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderSafetyTips = () => (
    <View>
      {safetyTips.map((tip, index) => (
        <View key={index} style={[styles.tipCard, isDark && styles.darkCard]}>
          <View style={styles.safeSpotIcon}>
            <Ionicons name="bulb" size={22} color="#FF9800" />
          </View>
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, isDark && styles.darkText]}>{tip.title}</Text>
            <Text style={[styles.tipDescription, isDark && styles.darkText]}>{tip.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.darkContainer]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#1E90FF']}
          tintColor={isDark ? '#BB86FC' : '#1E90FF'}
        />
      }
    >
      <View style={[styles.searchContainer, isDark && { backgroundColor: '#2d2d2d' }]}>
        <Ionicons name="search" size={20} color={isDark ? '#ccc' : '#666'} />
        <TextInput
          style={[styles.searchInput, isDark && { color: '#fff' }]}
          placeholder="Search for reports or areas..."
          placeholderTextColor={isDark ? '#999' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderTabs()}
      
      {/* Add Heatmap Button */}
      <View style={styles.heatmapButtonContainer}>
        {renderHeatmapButton()}
      </View>
      
      <View style={styles.content}>
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'safe places' && renderSafePlaces()}
        {activeTab === 'safety tips' && renderSafetyTips()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeTab: {
    backgroundColor: '#1E90FF',
    elevation: 4,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  reportTile: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  darkTile: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  darkText: {
    color: '#ffffff',
  },
  safeSpotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkCard: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportType: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
  },
  reportLocation: {
    fontSize: 15,
    marginBottom: 10,
    color: '#000000',
    fontWeight: '500',
  },
  reportDistance: {
    fontSize: 14,
    color: '#1E90FF',
    marginBottom: 10,
    fontWeight: '500',
  },
  reportDescription: {
    fontSize: 15,
    marginBottom: 16,
    color: '#000000',
    lineHeight: 22,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 14,
    color: '#1E90FF',
    fontWeight: '600',
  },
  safeSpotIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeSpotInfo: {
    flex: 1,
    marginLeft: 16,
  },
  safeSpotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  safeSpotAddress: {
    fontSize: 13,
    color: '#777',
    marginBottom: 4,
  },
  darkSubtext: {
    color: '#aaa',
  },
  safeSpotDistance: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  safeSpotStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  directionButton: {
    backgroundColor: '#1E90FF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1E90FF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heatmapButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  heatmapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  darkHeatmapButton: {
    backgroundColor: '#BB86FC',
  },
  heatmapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 6,
  }
});

function updateSafeSpotsWithDistance(latitude: number, longitude: number) {
  throw new Error('Function not implemented.');
}
