import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { useLabs } from '../../../src/hooks/use-labs';
import { ClassData, subscribeClasses } from '../../../src/lib/classes';
import { MAX_LAB_RADIUS_METERS } from '../../../src/utils/attendance-location';
import {
  resolveParticipantUids,
  type ClassParticipant,
  type SessionInput,
} from '../../../src/services/assistant-service';
import { theme } from '../theme';


interface SessionFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<SessionInput>;
  onClose: () => void;
  onSubmit: (data: SessionInput) => Promise<void>;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 20) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`);
  }
}

function formatIndonesianDate(d: Date): string {
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function getGMT7Date(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

export function SessionFormModal({
  visible,
  mode,
  initialData,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const { labs, status: labsStatus } = useLabs();

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  // Ruangan sekarang ditentukan di sini (dari laboratorium yang dipilih),
  // bukan dari data kelas.
  const [room, setRoom] = useState('');
  const [labId, setLabId] = useState('');
  const [description, setDescription] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('15:00');
  
  const [activePicker, setActivePicker] = useState<'course' | 'class' | 'lab' | 'start' | 'end' | null>(null);

  const [mapping, setMapping] = useState<{
    mapped: number;
    total: number;
    unmatched: ClassParticipant[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mappingRequest = useRef(0);

  useEffect(() => {
    const unsubClasses = subscribeClasses(
      (items) => setClasses(items),
      () => {}
    );
    return () => unsubClasses();
  }, []);

  const resetFormFromInitial = () => {
    setCourseName(initialData?.courseName || '');
    setCourseCode(initialData?.courseCode || '');
    setClassId(initialData?.classId || '');
    setClassName(initialData?.className || '');
    setRoom(initialData?.room || '');
    setLabId(initialData?.labId || '');
    setDescription(initialData?.description || '');
    setParticipantIds(initialData?.participantIds || []);
    setMapping(null);
    setError(null);
    setShowCalendar(false);

    if (initialData?.date instanceof Date) {
      setSelectedDate(initialData.date);
      setCalendarMonth(new Date(initialData.date.getFullYear(), initialData.date.getMonth(), 1));
    } else if (initialData?.dateTimestamp instanceof Timestamp) {
      const d = initialData.dateTimestamp.toDate();
      setSelectedDate(d);
      setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const now = new Date();
      setSelectedDate(now);
      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    if (initialData?.startTime && initialData?.endTime) {
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
    } else if (initialData?.timeRange) {
      const match = initialData.timeRange.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
      if (match) {
        setStartTime(match[1].replace('.', ':'));
        setEndTime(match[2].replace('.', ':'));
      }
    }
  };

  const uniqueCourses = Array.from(new Set(classes.map(c => c.course)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const filteredClasses = classes
    .filter((cls) => !courseName || !cls.course || cls.course.toLowerCase() === courseName.toLowerCase())
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedLab = labs.find((lab) => lab.id === labId);

  const handleSelectCourse = (course: string) => {
    setCourseName(course);
    const available = classes.filter((c) => c.course === course);
    if (available.length > 0) {
      setClassName('');
      setClassId('');
      setParticipantIds([]);
      setMapping(null);
    }
  };

  const handleSelectClass = async (c: ClassData) => {
    const requestId = ++mappingRequest.current;
    setClassName(c.name);
    setClassId(c.id);

    if (c.participants.length === 0) {
      setParticipantIds([]);
      setMapping({ mapped: 0, total: 0, unmatched: [] });
      return;
    }

    const result = await resolveParticipantUids(c.participants);
    if (mappingRequest.current !== requestId) return;

    setParticipantIds(result.uids);
    setMapping({
      mapped: result.uids.length,
      total: c.participants.length,
      unmatched: result.unmatched,
    });
  };

  const renderCalendarGrid = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: React.ReactNode[] = [];
    const today = getGMT7Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isPast = cellDate < today;
      const isSelected =
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day;

      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      cells.push(
        <Pressable
          key={`day-${day}`}
          disabled={isPast}
          style={[
            styles.calendarCell,
            isPast && styles.calendarCellDisabled,
            isSelected && styles.calendarCellSelected,
            isToday && !isSelected && styles.calendarCellToday,
          ]}
          onPress={() => {
            setSelectedDate(new Date(year, month, day));
            setShowCalendar(false);
          }}
        >
          <Text
            style={[
              styles.calendarDayText,
              isPast && styles.calendarDayTextDisabled,
              isSelected && styles.calendarDayTextSelected,
              isToday && !isSelected && styles.calendarDayTextToday,
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }
    return cells;
  };

  const handleSave = async () => {
    if (!courseName.trim()) return setError('Pilih Mata Kuliah terlebih dahulu.');
    if (!className.trim()) return setError('Pilih Kelas Praktikum terlebih dahulu.');
    if (!selectedLab) return setError('Pilih Laboratorium (ruangan dan lokasi presensi).');

    const radiusValue = selectedLab.radiusMeters;
    if (!Number.isFinite(radiusValue) || radiusValue < 1 || radiusValue > MAX_LAB_RADIUS_METERS) {
      return setError(`Radius laboratorium harus antara 1 dan ${MAX_LAB_RADIUS_METERS} meter.`);
    }
    
    const today = getGMT7Date();
    today.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    
    if (selDate < today) return setError('Tidak bisa memilih tanggal di masa lalu.');
    if (endTime <= startTime) return setError('Jam selesai harus lebih lambat dari jam mulai.');

    setError(null);
    setBusy(true);

    const dateLabelFormatted = formatIndonesianDate(selectedDate);
    const timeRangeFormatted = `${startTime}–${endTime} WIB`;

    try {
      await onSubmit({
        courseName: courseName.trim(),
        courseCode: courseCode.trim(),
        classId: classId || undefined,
        className: className.trim(),
        dateLabel: dateLabelFormatted,
        timeRange: timeRangeFormatted,
        room: selectedLab.name,
        labId: selectedLab.id,
        radiusM: radiusValue,
        description: description.trim(),
        participantIds,
        date: selectedDate,
        dateTimestamp: Timestamp.fromDate(selectedDate),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan sesi praktikum.');
    } finally {
      setBusy(false);
    }
  };

  const nowGMT7 = getGMT7Date();
  const isToday = selectedDate.getDate() === nowGMT7.getDate() && 
                  selectedDate.getMonth() === nowGMT7.getMonth() && 
                  selectedDate.getFullYear() === nowGMT7.getFullYear();

  const currentTimeStr = `${nowGMT7.getHours().toString().padStart(2, '0')}:${nowGMT7.getMinutes().toString().padStart(2, '0')}`;

  const availableStartTimes = TIME_OPTIONS.filter((t) => {
    if (t >= endTime) return false;
    if (isToday && t <= currentTimeStr) return false;
    return true;
  });

  const availableEndTimes = TIME_OPTIONS.filter((t) => t > startTime);

  const renderPickerModal = () => {
    if (!activePicker) return null;

    let title = '';
    let options: { label: string; value: string; onPress: () => void }[] = [];
    let emptyPickerMessage = 'Tidak ada pilihan tersedia.';

    if (activePicker === 'course') {
      title = 'Pilih Mata Kuliah';
      options = uniqueCourses.map(c => ({
        label: c,
        value: c,
        onPress: () => handleSelectCourse(c)
      }));
    } else if (activePicker === 'class') {
      title = 'Pilih Kelas';
      options = filteredClasses.map(c => ({
        label: c.name,
        value: c.name,
        onPress: () => void handleSelectClass(c)
      }));
    } else if (activePicker === 'lab') {
      title = 'Pilih Laboratorium';
      emptyPickerMessage = labsStatus === 'loading'
        ? 'Memuat daftar laboratorium...'
        : 'Daftar laboratorium belum tersedia. Periksa koneksi atau tambahkan lab.';
      options = labs.map(l => ({
        label: l.name,
        value: l.id,
        onPress: () => {
          setLabId(l.id);
          setRoom(l.name);
        }
      }));
    } else if (activePicker === 'start') {
      title = 'Jam Mulai';
      options = availableStartTimes.map(t => ({
        label: t,
        value: t,
        onPress: () => {
          setStartTime(t);
          if (endTime <= t) {
            const nextIndex = TIME_OPTIONS.indexOf(t) + 1;
            if (nextIndex < TIME_OPTIONS.length) setEndTime(TIME_OPTIONS[nextIndex]);
          }
        }
      }));
    } else if (activePicker === 'end') {
      title = 'Jam Selesai';
      options = availableEndTimes.map(t => ({
        label: t,
        value: t,
        onPress: () => setEndTime(t)
      }));
    }

    return (
      <Modal visible transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActivePicker(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 20 }}>{emptyPickerMessage}</Text>
              ) : (
                options.map((opt, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.modalItem}
                    onPress={() => {
                      opt.onPress();
                      setActivePicker(null);
                    }}
                  >
                    <Text style={styles.modalItemText}>{opt.label}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setActivePicker(null)}>
              <Text style={styles.modalCloseBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
      onShow={resetFormFromInitial}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.formTitle}>
            {mode === 'create' ? 'Tambah Sesi Praktikum' : 'Ubah Sesi Praktikum'}
          </Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mata Kuliah</Text>
              <Pressable style={styles.dropdownInput} onPress={() => setActivePicker('course')}>
                <Text style={[styles.dropdownInputText, !courseName && { color: '#94A3B8' }]}>
                  {courseName || 'Pilih Mata Kuliah'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kelas</Text>
              <Pressable 
                style={[styles.dropdownInput, !courseName && { opacity: 0.5 }]} 
                onPress={() => courseName && setActivePicker('class')}
                disabled={!courseName}
              >
                <Text style={[styles.dropdownInputText, !className && { color: '#94A3B8' }]}>
                  {className || 'Pilih Kelas'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>
              {mapping && (
                <Text style={styles.mappingText}>
                  {mapping.total === 0 ? 'Kelas ini belum memiliki peserta.' : `${mapping.mapped} dari ${mapping.total} peserta terpetakan.`}
                </Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kode Matkul</Text>
              <TextInput
                style={styles.inputDisabled}
                value={courseCode}
                editable={false}
                placeholder="Otomatis"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Laboratorium (Ruangan dan Lokasi Presensi)</Text>
              <Pressable style={styles.dropdownInput} onPress={() => setActivePicker('lab')}>
                <Text style={[styles.dropdownInputText, !selectedLab && { color: '#94A3B8' }]}>
                  {selectedLab?.name || (room ? `${room} (pilih lab untuk memperbarui)` : 'Pilih Laboratorium')}
                </Text>
                <Ionicons name="location-outline" size={18} color="#64748B" />
              </Pressable>
              <Text style={styles.hintText}>
                Ruangan sesi otomatis mengikuti laboratorium yang dipilih.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Radius Presensi (dari Lab)</Text>
              <View style={styles.radiusRow}>
                <TextInput
                  style={styles.radiusInput}
                  value={selectedLab ? String(selectedLab.radiusMeters) : ''}
                  placeholder="Pilih laboratorium dulu"
                  placeholderTextColor="#94A3B8"
                  editable={false}
                />
                <Text style={styles.radiusUnit}>meter</Text>
              </View>
              <Text style={styles.hintText}>
                Radius mengikuti laboratorium yang dipilih.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tanggal Praktikum</Text>
              <Pressable style={styles.dropdownInput} onPress={() => setShowCalendar(!showCalendar)}>
                <Text style={styles.dropdownInputText}>{formatIndonesianDate(selectedDate)}</Text>
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
              </Pressable>

              {showCalendar && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <Pressable style={styles.calendarNavButton} onPress={() => { const prev = new Date(calendarMonth); prev.setMonth(prev.getMonth() - 1); setCalendarMonth(prev); }}>
                      <Ionicons name="chevron-back" size={20} color="#64748B" />
                    </Pressable>
                    <Text style={styles.calendarMonthText}>{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
                    <Pressable style={styles.calendarNavButton} onPress={() => { const next = new Date(calendarMonth); next.setMonth(next.getMonth() + 1); setCalendarMonth(next); }}>
                      <Ionicons name="chevron-forward" size={20} color="#64748B" />
                    </Pressable>
                  </View>
                  <View style={styles.dayNamesRow}>
                    {DAY_NAMES.map((name) => (
                      <View key={name} style={styles.calendarCell}><Text style={styles.dayNameText}>{name}</Text></View>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>{renderCalendarGrid()}</View>
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Jam Mulai</Text>
                <Pressable style={styles.dropdownInput} onPress={() => setActivePicker('start')}>
                  <Text style={styles.dropdownInputText}>{startTime}</Text>
                  <Ionicons name="time-outline" size={18} color="#64748B" />
                </Pressable>
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Jam Selesai</Text>
                <Pressable style={styles.dropdownInput} onPress={() => setActivePicker('end')}>
                  <Text style={styles.dropdownInputText}>{endTime}</Text>
                  <Ionicons name="time-outline" size={18} color="#64748B" />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Topik / Deskripsi (Opsional)</Text>
              <TextInput 
                style={[styles.input, styles.multilineInput]} 
                value={description} 
                onChangeText={setDescription} 
                multiline 
                numberOfLines={2} 
                editable={!busy} 
                placeholder="Contoh: Modul 4 - Firebase"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            <View style={styles.buttonRow}>
              <Pressable disabled={busy} style={[styles.button, styles.saveButton]} onPress={handleSave}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>{mode === 'create' ? 'Simpan Sesi' : 'Simpan Perubahan'}</Text>}
              </Pressable>
              <Pressable disabled={busy} style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {renderPickerModal()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, maxHeight: '90%' },
  grabber: { width: 44, height: 5, backgroundColor: '#D1D5DB', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#1B2A4E', marginBottom: 20, textAlign: 'center' },
  formScroll: { marginBottom: 8 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#1B2A4E', marginBottom: 8 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1B2A4E' },
  inputDisabled: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#64748B' },
  dropdownInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, justifyContent: 'space-between' },
  dropdownInputText: { fontSize: 14, color: '#1B2A4E', fontWeight: '500', flexShrink: 1 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  mappingText: { fontSize: 12, color: '#15803D', marginTop: 8, fontWeight: '600' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radiusInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1B2A4E' },
  radiusUnit: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  hintText: { fontSize: 12, color: '#64748B', marginTop: 8 },
  calendarContainer: { marginTop: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, elevation: 2 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  calendarNavButton: { padding: 6 },
  calendarMonthText: { fontSize: 15, fontWeight: '800', color: '#1B2A4E' },
  dayNamesRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8, marginBottom: 8 },
  dayNameText: { fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  calendarCellSelected: { backgroundColor: '#1B2A4E' },
  calendarCellToday: { borderWidth: 1, borderColor: '#1B2A4E' },
  calendarCellDisabled: { opacity: 0.3 },
  calendarDayText: { fontSize: 14, color: '#1B2A4E' },
  calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  calendarDayTextToday: { color: '#1B2A4E', fontWeight: '800' },
  calendarDayTextDisabled: { color: '#64748B' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  button: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#1B2A4E' },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelButton: { backgroundColor: '#F1F5F9' },
  cancelButtonText: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#1B2A4E', fontWeight: '600' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 14, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
  modalCloseBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});