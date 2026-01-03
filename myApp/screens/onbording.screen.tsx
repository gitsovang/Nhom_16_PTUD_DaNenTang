import React from 'react';
import { StyleSheet, View, ImageBackground, Dimensions, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
    const handleStarted = () => {
        router.replace("/login");
    }
  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://i.pinimg.com/1200x/4b/5e/fe/4b5efe08d4bc344057f51f15d1064df1.jpg' }}
        style={styles.image}
        resizeMode="cover"
        blurRadius={2} 
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to UShop</Text>
          <Text style={styles.subtitle}>Explore your best products here!</Text>
          <TouchableOpacity style={styles.button} onPress={handleStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  image: {
    width: width,
    height: height,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80, 
  },
  title: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FFD700', 
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
