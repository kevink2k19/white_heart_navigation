import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { X, TrendingUp, DollarSign } from 'lucide-react-native';

interface DemandModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (newDemandValue: number) => void; // pass updated demand back
  currentDemand: number;                      // track current demand
  baseFare: number;
  currentDistance: number;
  fareRate: number;
}

const DEMAND_OPTIONS = [
  { value: 500, label: 'Low Demand', color: '#10B981' },
  { value: 1000, label: 'Medium Demand', color: '#F59E0B' },
  { value: 2000, label: 'High Demand', color: '#EF4444' },
];

export default function DemandModal({
  visible,
  onClose,
  onSelect,
  currentDemand,
  baseFare,
  currentDistance,
  fareRate,
}: DemandModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleOptionClick = (amount: number) => {
    const newTotal = currentDemand + amount;
    onSelect(newTotal);   // immediately add demand
    onClose();            // close after click
  };

  const handleClear = () => {
    onSelect(0);
    onClose();
  };

  const calcFare = (demandPreview: number) =>
    baseFare + currentDistance * fareRate + demandPreview;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Add Demand</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {DEMAND_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, { borderColor: opt.color }]}
                    onPress={() => handleOptionClick(opt.value)}
                  >
                    <TrendingUp size={20} color={opt.color} />
                    <Text style={styles.optionText}>{opt.label} (+{opt.value} MMK)</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Clear */}
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <DollarSign size={18} color="white" />
                <Text style={styles.clearText}>Clear Demand</Text>
              </TouchableOpacity>

              {/* Preview */}
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Current Demand: {currentDemand.toLocaleString()} MMK</Text>
                <Text style={styles.previewTotal}>
                  Total Fare: {calcFare(currentDemand).toLocaleString()} MMK
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '85%', maxWidth: 400 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 4 },
  optionsContainer: { marginBottom: 16 },
  option: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  clearText: { color: 'white', fontWeight: '700', fontSize: 15 },
  preview: { alignItems: 'center' },
  previewLabel: { fontSize: 14, color: '#374151', marginBottom: 4 },
  previewTotal: { fontSize: 16, fontWeight: '700', color: '#10B981' },
});
