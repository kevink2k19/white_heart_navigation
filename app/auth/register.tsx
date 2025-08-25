import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, MessageSquare, ArrowRight, User, Car, IdCard } from 'lucide-react-native';

interface RegisterFormData {
  fullName: string;
  licenseNumber: string;
  carNumber: string;
  phoneNumber: string;
  otp: string;
}

interface FormErrors {
  fullName?: string;
  licenseNumber?: string;
  carNumber?: string;
  phoneNumber?: string;
  otp?: string;
  general?: string;
}

export default function RegisterScreen() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    licenseNumber: '',
    carNumber: '',
    phoneNumber: '',
    otp: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showOtp, setShowOtp] = useState(false);

  // OTP resend countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id: ReturnType<typeof setInterval> = setInterval(() => {
      setOtpTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  // Validation
  const validatePhoneNumber = (phone: string): boolean => {
    // Myanmar: starts with 9 and 9–10 digits total (without +95)
    const phoneRegex = /^9\d{8,9}$/;
    return phoneRegex.test(phone);
  };

  const validateOtp = (otp: string): boolean => /^\d{6}$/.test(otp);

  // Inputs
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    let v = value;

    if (field === 'phoneNumber') {
      v = value.replace(/\D/g, '');
      if (v.length > 10) return; // cap to 10 digits after 9
    }

    if (field === 'otp') {
      v = value.replace(/\D/g, '').slice(0, 6);
    }

    setFormData(prev => ({ ...prev, [field]: v }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!formData.carNumber.trim()) newErrors.carNumber = 'Car number is required';

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid Myanmar phone number (start with 9, 9–10 digits)';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      // Simulate API request
      await new Promise(res => setTimeout(res, 1200));
      // Actual: await sendRegistrationOtpApi(`+95${formData.phoneNumber}`, {...})

      setIsOtpSent(true);
      setOtpTimer(60);
      Alert.alert('OTP Sent', `Verification code sent to +95 ${formData.phoneNumber}`);
    } catch (e) {
      setErrors(prev => ({ ...prev, general: 'Failed to send OTP. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit (Register)
  const handleRegister = async () => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!formData.carNumber.trim()) newErrors.carNumber = 'Car number is required';

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid Myanmar phone number';
    }

    if (!formData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOtp(formData.otp)) {
      newErrors.otp = 'Enter a valid 6-digit OTP';
    }

    if (!isOtpSent) newErrors.otp = 'Please request OTP first';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      // Simulate backend verification
      await new Promise(res => setTimeout(res, 1200));
      // Actual: await registerDriverApi({ ...formData, phoneNumber: `+95${formData.phoneNumber}` })

      if (formData.otp === '123456') { // demo
        Alert.alert('Registration Successful', 'Welcome to White Heart Driver!', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)/') },
        ]);
      } else {
        setErrors(prev => ({ ...prev, otp: 'Invalid OTP. Please try again.' }));
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, general: 'Registration failed. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to login (if you keep a login screen)
  const goLogin = () => router.push('/auth/login');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Driver Account</Text>
            <Text style={styles.subtitle}>Join White Heart Driver today</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, errors.fullName && styles.inputError]}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={t => handleChange('fullName', t)}
                  autoComplete="name"
                />
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* License Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Number</Text>
              <View style={styles.inputContainer}>
                <IdCard size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, errors.licenseNumber && styles.inputError]}
                  placeholder="e.g., ABC-123456"
                  value={formData.licenseNumber}
                  onChangeText={t => handleChange('licenseNumber', t)}
                  autoCapitalize="characters"
                />
              </View>
              {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}
            </View>

            {/* Car Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Car Number</Text>
              <View style={styles.inputContainer}>
                <Car size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, errors.carNumber && styles.inputError]}
                  placeholder="e.g., YGN-9X9999"
                  value={formData.carNumber}
                  onChangeText={t => handleChange('carNumber', t)}
                  autoCapitalize="characters"
                />
              </View>
              {errors.carNumber && <Text style={styles.errorText}>{errors.carNumber}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Phone size={20} color="#6B7280" />
                  <Text style={styles.countryCodeText}>+95</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, errors.phoneNumber && styles.inputError]}
                  placeholder="9 123 456 789"
                  value={formData.phoneNumber}
                  onChangeText={t => handleChange('phoneNumber', t)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                />
              </View>
              {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
            </View>

            {/* OTP */}
            <View style={styles.inputGroup}>
              <View style={styles.otpHeader}>
                <Text style={styles.label}>Verification Code</Text>
                <TouchableOpacity
                  style={[styles.otpButton, (isLoading || otpTimer > 0) && styles.otpButtonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading || otpTimer > 0}
                >
                  <MessageSquare size={16} color="white" />
                  <Text style={styles.otpButtonText}>
                    {otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Get OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.otpInputContainer}>
                <TextInput
                  style={[styles.otpInput, errors.otp && styles.inputError]}
                  placeholder="Enter 6-digit code"
                  value={formData.otp}
                  onChangeText={t => handleChange('otp', t)}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showOtp}
                  autoComplete="one-time-code"
                />
                <TouchableOpacity style={styles.otpToggle} onPress={() => setShowOtp(s => !s)}>
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>{showOtp ? 'HIDE' : 'SHOW'}</Text>
                </TouchableOpacity>
              </View>

              {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
              {isOtpSent && !errors.otp && (
                <Text style={styles.successText}>OTP sent to +95 {formData.phoneNumber}</Text>
              )}
            </View>

            {/* General error */}
            {errors.general && <Text style={styles.generalError}>{errors.general}</Text>}

            {/* Register */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Register</Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Optional: link to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={goLogin}>
              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Login here</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Demo */}
          <View style={styles.demoInstructions}>
            <Text style={styles.demoTitle}>Demo Instructions:</Text>
            <Text style={styles.demoText}>• Fill all fields</Text>
            <Text style={styles.demoText}>• Use OTP: 123456 for demo registration</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center' },

  form: {
    backgroundColor: 'white', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 24,
  },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB',
  },
  inputIcon: { marginLeft: 16 },
  textInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 16, fontSize: 16, color: '#1F2937' },

  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB',
  },
  countryCode: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 8,
  },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#1F2937' },

  otpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  otpButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, gap: 6,
  },
  otpButtonDisabled: { backgroundColor: '#9CA3AF' },
  otpButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },

  otpInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB',
  },
  otpInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#1F2937', letterSpacing: 2 },
  otpToggle: { paddingHorizontal: 16, paddingVertical: 16 },

  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 4 },
  successText: { fontSize: 14, color: '#10B981', marginTop: 4 },

  generalError: {
    fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 16,
    padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA',
  },

  registerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, gap: 8,
  },
  registerButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  footerText: { fontSize: 16, color: '#6B7280' },
  loginLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loginLinkText: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },

  demoInstructions: {
    backgroundColor: '#D1FAE5', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  demoTitle: { fontSize: 16, fontWeight: '600', color: '#065F46', marginBottom: 8 },
  demoText: { fontSize: 14, color: '#065F46', marginBottom: 4 },
});
