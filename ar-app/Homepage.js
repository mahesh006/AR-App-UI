import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions, SafeAreaView, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Voice from '@react-native-voice/voice';
import { Camera } from 'expo-camera';

const SCREEN_WIDTH = Dimensions.get('window').width;

const SideNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(-SCREEN_WIDTH));
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const cameraRef = useRef(null);

  const navItems = [
    { icon: 'home', text: 'Home' },
    { icon: 'person', text: 'Profile' },
    { icon: 'settings', text: 'Settings' },
  ];

  const toggleMenu = useCallback(() => {
    const toValue = isOpen ? -SCREEN_WIDTH : 0;
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  }, [isOpen, animation]);

  const onSpeechResults = (event) => {
    setSpokenText(event.value[0]);
    setIsListening(false);
  };

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message: "This app needs access to your microphone for speech recognition.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true;
    }
  };

  const checkVoiceAvailability = async () => {
    try {
      const isAvailable = await Voice.isAvailable();
      setIsVoiceAvailable(isAvailable);
    } catch (error) {
      console.error('Error checking voice availability:', error);
      setIsVoiceAvailable(false);
    }
  };

  const startListening = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Microphone permission is required for speech recognition.");
        return;
      }

      if (!isVoiceAvailable) {
        Alert.alert("Voice Recognition Unavailable", "Voice recognition is not available on this device.");
        return;
      }

      setIsListening(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Failed to start speech recognition', error);
      Alert.alert("Error", "Failed to start speech recognition. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop speech recognition', error);
      Alert.alert("Error", "Failed to stop speech recognition. Please try again.");
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  useEffect(() => {
    const init = async () => {
      const hasPermission = await requestMicrophonePermission();
      if (hasPermission) {
        await checkVoiceAvailability();
      }

      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    };

    init();

    Voice.onSpeechResults = onSpeechResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (spokenText.toLowerCase().includes('open menu')) {
      if (!isOpen) toggleMenu();
    } else if (spokenText.toLowerCase().includes('close menu')) {
      if (isOpen) toggleMenu();
    }
  }, [spokenText, isOpen, toggleMenu]);

  if (hasCameraPermission === null) {
    return <View />;
  }
  if (hasCameraPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topNavBar, { marginTop: Constants.statusBarHeight }]}>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <Ionicons name="menu" size={30} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>AR APP</Text>
        <TouchableOpacity 
          onPress={isListening ? stopListening : startListening} 
          style={styles.voiceButton}
        >
          <Ionicons 
            name={isListening ? "mic" : "mic-off"} 
            size={30} 
            color={isListening ? "#2c3e50" : "#999999"} 
          />
        </TouchableOpacity>
      </View>
      
      <Camera style={styles.camera} type={cameraType} ref={cameraRef}>
        <View style={styles.cameraButtonContainer}>
          <TouchableOpacity style={styles.cameraButton} onPress={toggleCameraType}>
            <Ionicons name="camera-reverse" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Camera>

      <Animated.View 
        style={[
          styles.sideMenu,
          { transform: [{ translateX: animation }] }
        ]}
      >
        <View style={styles.sideMenuContent}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={toggleMenu}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {navItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.navItem}>
                <Ionicons name={item.icon} size={24} color="white" style={styles.icon} />
                <Text style={styles.navText}>{item.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
      {spokenText ? <Text style={styles.spokenText}>You said: {spokenText}</Text> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 15,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 5,
  },
  voiceButton: {
    padding: 5,
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: Constants.statusBarHeight,
    width: SCREEN_WIDTH * 0.7,
    height: '100%',
    backgroundColor: '#2c3e50',
  },
  sideMenuContent: {
    flex: 1,
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    padding: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  icon: {
    marginRight: 15,
  },
  navText: {
    color: 'white',
    fontSize: 16,
  },
  spokenText: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 10,
    borderRadius: 5,
  },
  camera: {
    flex: 1,
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 20,
  },
  cameraButton: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
});

export default SideNav;