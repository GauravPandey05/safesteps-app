import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [trustedContact, setTrustedContact] = useState({ name: '', phone: '' });
  const router = useRouter();

  const handleSignup = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    // Validate emergency contact
    if (!emergencyContact) {
      Alert.alert('Missing Emergency Contact', 'Please provide an emergency contact.');
      return;
    }

    // Validate address
    if (!address) {
      Alert.alert('Missing Address', 'Please provide your address.');
      return;
    }

    // Validate trusted contact
    if (!trustedContact.name || !trustedContact.phone) {
      Alert.alert('Missing Trusted Contact', 'Please provide details for the Trusted Contact.');
      return;
    }

    // Add +91 prefix to phone numbers
    const formattedTrustedContact = {
      name: trustedContact.name,
      phone: trustedContact.phone.startsWith('+91') ? trustedContact.phone : `+91${trustedContact.phone}`,
    };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user details to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        emergencyContact: emergencyContact.startsWith('+91') ? emergencyContact : `+91${emergencyContact}`,
        address,
        trustedContacts: [formattedTrustedContact],
      });

      console.log('User signed up:', user.uid); // Log the user ID for debugging
      Alert.alert('Signup Successful', 'Welcome!');
      router.replace('/'); // Redirect to the home screen
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Signup Failed', errorMessage);
      console.log('Signup error:', error); // Log the error for debugging
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.heading}>Signup</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Emergency Contact"
          keyboardType="phone-pad"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
        />
        <Text style={styles.subHeading}>Trusted Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={trustedContact.name}
          onChangeText={(text) => setTrustedContact({ ...trustedContact, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          keyboardType="phone-pad"
          value={trustedContact.phone}
          onChangeText={(text) => setTrustedContact({ ...trustedContact, phone: text })}
        />
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Signup</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#E5ECE9', // Match padding color with background color
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#E5ECE9',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333333',
  },
  subHeading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555555',
  },
  input: {
    backgroundColor: '#cccccc',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#f09599', // Updated button color
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  logo: {
    width: 150, // Increased width
    height: 150, // Increased height
    alignSelf: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});