import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function SOSScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [customMinutes, setCustomMinutes] = useState('5');

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Location access helps us keep you safe in emergencies.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (error) {
      console.error('Failed to fetch location:', error);
      Alert.alert('Location Update', 'We\'re having trouble finding your location. Retrying...');
      setTimeout(fetchLocation, 3000);
    }
  };

  // Rest of your existing functions (fetchTrustedContacts, sendSMSToContacts, handleSOS, etc.)
  const fetchTrustedContacts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData?.trustedContacts || userData.trustedContacts.length === 0) {
        throw new Error('No emergency contacts found in your profile.');
      }

      return userData.trustedContacts.map((contact: any) => {
        if (!contact.name || !contact.phone) {
          throw new Error('Invalid contact format in trustedContacts.');
        }
        return { name: contact.name, phone: contact.phone };
      });
    } catch (error) {
      console.error('Failed to fetch trusted contacts:', error);
      throw error;
    }
  };

  const sendSMSToContacts = async (contacts: any[], lat: number, lon: number) => {
    const message = `🚨 SOS ALERT from SafeSteps\nI need help! My location: https://maps.google.com/?q=${lat},${lon}`;
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) throw new Error('SMS is not available on this device.');

    for (const contact of contacts) {
      try {
        await SMS.sendSMSAsync([contact.phone], message);
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.phone}:`, error);
      }
    }
  };

  const handleSOS = async () => {
    if (!location) {
      Alert.alert('Location not available', 'Wait until your location is fetched.');
      return;
    }

    setLoading(true);
    const { latitude, longitude } = location.coords;

    try {
      const contacts = await fetchTrustedContacts();

      await addDoc(collection(db, 'sosAlerts'), {
        latitude,
        longitude,
        timestamp: serverTimestamp(),
      });

      await sendSMSToContacts(contacts, latitude, longitude);

      Toast.show({
        type: 'success',
        text1: '✅ Help is on the way!',
        text2: 'Your trusted contacts have been notified.',
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: '❌ Alert not sent: ' + error.message,
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const startCheckInTimer = (minutes: number) => {
    if (timerStarted || intervalId) return;

    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Invalid Time', 'Please enter a valid number of minutes.');
      return;
    }

    const totalSeconds = minutes * 60;
    setTimerStarted(true);
    setSecondsLeft(totalSeconds);

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTimerStarted(false);
          handleSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setIntervalId(id);
  };

  const cancelCheckInTimer = () => {
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    setTimerStarted(false);
    setSecondsLeft(300);
    Toast.show({
      type: 'success',
      text1: '✅ You\'re safe. Timer cancelled.',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <Text style={styles.heading}>Safety Center</Text>
        <Text style={styles.tagline}>You're never alone. We're here for you.</Text>
      </View>

      {location ? (
        <View style={styles.contentContainer}>
          <View style={styles.sosSection}>
            <Text style={styles.sectionTitle}>Emergency Alert</Text>
            <Text style={styles.description}>
              Press the button below to immediately notify your trusted contacts with your location.
            </Text>

            <TouchableOpacity 
              style={styles.emergencyButton} 
              onPress={handleSOS} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="alert-circle" size={24} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.emergencyButtonText}>SEND EMERGENCY ALERT</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.timerSection}>
            <Text style={styles.sectionTitle}>Safety Check Timer</Text>
            <Text style={styles.description}>
              Set a timer for when you expect to reach your destination safely. 
              If you don't check in, we'll alert your contacts.
            </Text>

            {!timerStarted ? (
              <View style={styles.timerSetupContainer}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    placeholder="Minutes"
                    placeholderTextColor="#9E768F"
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                  />
                </View>

                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={() => startCheckInTimer(Number(customMinutes))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="timer-outline" size={22} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.timerButtonText}>Start Safety Timer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.activeTimerContainer}>
                <View style={styles.timerDisplay}>
                  <Text style={styles.timerValue}>
                    {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.timerLabel}>Remaining</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.cancelTimerButton}
                  onPress={cancelCheckInTimer}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.cancelTimerText}>I'm Safe - Cancel Timer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsText}>
              💡 Remember to keep your phone charged and within reach
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Finding your location...</Text>
        </View>
      )}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sosSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 15,
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  timerSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  timerSetupContainer: {
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  timeInput: {
    borderWidth: 1.5,
    borderColor: '#D1C4E9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '50%',
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#F9F5FF',
    color: '#9C27B0',
  },
  timerButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTimerContainer: {
    alignItems: 'center',
  },
  timerDisplay: {
    marginBottom: 20,
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#9C27B0',
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  cancelTimerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelTimerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  tipsText: {
    color: '#4A4A4A',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#9C27B0',
    fontSize: 16,
  },
});
