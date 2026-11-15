import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';

import { theme } from '../theme';
import {
  resolveParticipantUids,
  type ClassParticipant,
  type SessionInput,
} from '../../../src/services/assistant-service';
import { ClassData, subscribeClasses } from '../../../src/lib/classes';
import { CourseData, subscribeCourses, seedCoursesIfEmpty } from '../../../src/lib/courses';

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

const STANDARD_TIME_SLOTS = [
  { label: '07.30 - 09.30', start: '07:30', end: '09:30' },
  { label: '09.30 - 11.30', start: '09:30', end: '11:30' },
  { label: '10.20 - 12.10', start: '10:20', end: '12:10' },
  { label: '13.00 - 15.00', start: '13:00', end: '15:00' },
  { label: '15.30 - 17.30', start: '15:30', end: '17:30' },
];

function formatIndonesianDate(d: Date): string {
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function SessionFormModal({
  visible,
  mode,
  initialData,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [className, setClassName] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('15:00');

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
    const unsubCourses = subscribeCourses(
      (items) => setCourses(items),
      () => {}
    );
    void seedCoursesIfEmpty();

    return () => {
      unsubClasses();
      unsubCourses();
    };
  }, []);

  const resetFormFromInitial = () => {
    setCourseName(initialData?.courseName || '');
    setCourseCode(initialData?.courseCode || '');
    setClassName(initialData?.className || '');
    setRoom(initialData?.room || '');
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

  const handleSelectCourse = (c: CourseData) => {
    setSelectedCourseId(c.id);
    setCourseName(c.name);
    setCourseCode(c.code);
    if (!room && c.defaultRoom) {
      setRoom(c.defaultRoom);
    }
    if (!description && c.defaultDescription) {
      setDescription(c.defaultDescription);
    }

    const matchingClass = classes.find(
      (cls) => cls.course.toLowerCase() === c.name.toLowerCase()
    );
    if (matchingClass && !className) {
      void handleSelectClass(matchingClass);
    }
  };

  const handleSelectClass = async (c: ClassData) => {
    const requestId = ++mappingRequest.current;
    setClassName(c.name);
    if (!courseName && c.course) setCourseName(c.course);
    if (!room && c.room) setRoom(c.room);

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

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setSelectedDate(d);
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const renderCalendarGrid = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const isSelected =
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day;

      const isToday =
        new Date().getFullYear() === year &&
        new Date().getMonth() === month &&
        new Date().getDate() === day;

      cells.push(
        <Pressable
          key={`day-${day}`}
          style={[
            styles.calendarCell,
            isSelected && styles.calendarCellSelected,
            isToday && !isSelected && styles.calendarCellToday,
          ]}
          onPress={() => {
            const newDate = new Date(year, month, day);
            setSelectedDate(newDate);
            setShowCalendar(false);
          }}
        >
          <Text
            style={[
              styles.calendarDayText,
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
    if (!courseName.trim()) return setError('Nama mata praktikum wajib diisi.');
    if (!className.trim()) return setError('Kelas praktikum wajib diisi.');
    if (!room.trim()) return setError('Ruangan praktikum wajib diisi.');
    if (!selectedDate) return setError('Tanggal jadwal wajib dipilih.');
    if (!startTime.trim() || !endTime.trim()) return setError('Jam mulai dan jam selesai praktikum wajib diisi.');

    const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10));
    const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10));

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return setError('Format jam harus JJ:MM (contoh: 13:00).');
    }

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    if (endTotalMinutes <= startTotalMinutes) {
      return setError('Jam selesai praktikum harus lebih akhir dari jam mulai.');
    }

    setError(null);
    setBusy(true);

    const dateLabelFormatted = formatIndonesianDate(selectedDate);
    const timeRangeFormatted = `${startTime}–${endTime} WIB`;

    try {
      await onSubmit({
        courseName: courseName.trim(),
        courseCode: courseCode.trim(),
        className: className.trim(),
        dateLabel: dateLabelFormatted,
        timeRange: timeRangeFormatted,
        room: room.trim(),
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

  const filteredClasses = classes.filter((cls) => {
    if (!courseName) return true;
    return !cls.course || cls.course.toLowerCase() === courseName.toLowerCase();
  });

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
      onShow={resetFormFromInitial}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <Text style={styles.modalTitle}>
            {mode === 'create' ? 'Tambah Sesi Praktikum' : 'Ubah Sesi Praktikum'}
          </Text>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.label}>1. Pilih Mata Kuliah (Autofill):</Text>
                {courseCode ? (
                  <Text style={styles.badgeCode}>Kode: {courseCode}</Text>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {courses.map((c) => {
                    const isSelected =
                      selectedCourseId === c.id ||
                      courseName.toLowerCase() === c.name.toLowerCase();
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => handleSelectCourse(c)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 2 }]}>
                <Text style={styles.label}>Nama Mata Praktikum *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Pemrograman Mobile"
                  placeholderTextColor={theme.colors.textMuted}
                  value={courseName}
                  onChangeText={setCourseName}
                  editable={!busy}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Kode Matkul</Text>
                <TextInput
                  style={styles.input}
                  placeholder="IF184023"
                  placeholderTextColor={theme.colors.textMuted}
                  value={courseCode}
                  onChangeText={setCourseCode}
                  editable={!busy}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>2. Pilih Dari Kelas Tersedia:</Text>
              {filteredClasses.length > 0 ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {filteredClasses.map((c) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.chip,
                            className === c.name && styles.chipActive,
                          ]}
                          onPress={() => void handleSelectClass(c)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              className === c.name && styles.chipTextActive,
                            ]}
                          >
                            {c.name} ({c.room || 'Lab'})
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  {mapping ? (
                    <Text style={styles.mappingText}>
                      {mapping.total === 0
                        ? 'Kelas ini belum memiliki peserta.'
                        : `${mapping.mapped} dari ${mapping.total} peserta terpetakan ke akun.`}
                      {mapping.unmatched.length > 0
                        ? ' Sebagian peserta belum dapat dipetakan. Pastikan NIM profil terisi dan tidak ganda.'
                        : ''}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Mata Praktikum *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Pemrograman Mobile"
                placeholderTextColor={theme.colors.textMuted}
                value={courseName}
                onChangeText={setCourseName}
                editable={!busy}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Kelas *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: TI-3A"
                  placeholderTextColor={theme.colors.textMuted}
                  value={className}
                  onChangeText={(value) => {
                    mappingRequest.current += 1;
                    setClassName(value);
                    setParticipantIds([]);
                    setMapping(null);
                  }}
                  editable={!busy}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Ruangan / Lab *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Lab Mobile 2"
                  placeholderTextColor={theme.colors.textMuted}
                  value={room}
                  onChangeText={setRoom}
                  editable={!busy}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>3. Tanggal Praktikum (Kalender) *</Text>
              <Pressable
                style={styles.datePickerTrigger}
                onPress={() => setShowCalendar(!showCalendar)}
              >
                <Text style={styles.datePickerTriggerIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.datePickerValueText}>
                    {formatIndonesianDate(selectedDate)}
                  </Text>
                  <Text style={styles.datePickerHintText}>
                    {showCalendar ? 'Ketuk untuk menutup kalender' : 'Ketuk untuk membuka kalender'}
                  </Text>
                </View>
                <Text style={styles.dropdownArrow}>{showCalendar ? '▲' : '▼'}</Text>
              </Pressable>

              <View style={styles.presetRow}>
                <Pressable
                  style={styles.presetButton}
                  onPress={() => setQuickDate(0)}
                >
                  <Text style={styles.presetButtonText}>Hari Ini</Text>
                </Pressable>
                <Pressable
                  style={styles.presetButton}
                  onPress={() => setQuickDate(1)}
                >
                  <Text style={styles.presetButtonText}>Besok</Text>
                </Pressable>
                <Pressable
                  style={styles.presetButton}
                  onPress={() => setQuickDate(7)}
                >
                  <Text style={styles.presetButtonText}>Minggu Depan</Text>
                </Pressable>
              </View>

              {showCalendar && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      style={styles.calendarNavButton}
                      onPress={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      }}
                    >
                      <Text style={styles.calendarNavText}>◀</Text>
                    </Pressable>

                    <Text style={styles.calendarMonthText}>
                      {MONTH_NAMES[calendarMonth.getMonth()]}{' '}
                      {calendarMonth.getFullYear()}
                    </Text>

                    <Pressable
                      style={styles.calendarNavButton}
                      onPress={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
                    >
                      <Text style={styles.calendarNavText}>▶</Text>
                    </Pressable>
                  </View>

                  <View style={styles.dayNamesRow}>
                    {DAY_NAMES.map((name) => (
                      <View key={name} style={styles.calendarCell}>
                        <Text style={styles.dayNameText}>{name}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {renderCalendarGrid()}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>4. Waktu Praktikum (Jam Mulai & Selesai) *</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {STANDARD_TIME_SLOTS.map((slot) => {
                    const isSelected =
                      startTime === slot.start && endTime === slot.end;
                    return (
                      <Pressable
                        key={slot.label}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                        ]}
                        onPress={() => {
                          setStartTime(slot.start);
                          setEndTime(slot.end);
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>Jam Mulai (JJ:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="13:00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    editable={!busy}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.subLabel}>Jam Selesai (JJ:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="15:00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={endTime}
                    onChangeText={setEndTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    editable={!busy}
                  />
                </View>
              </View>

              <Text style={styles.timePreviewText}>
                Durasi: {startTime} s/d {endTime} WIB
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Deskripsi / Topik Praktikum (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Contoh: Modul 04 - Firebase Authentication & Firestore"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!busy}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                disabled={busy}
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {mode === 'create' ? 'Buat Sesi Praktikum' : 'Simpan Perubahan'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={busy}
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  grabber: {
    width: 44,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 14,
    textAlign: 'center',
  },
  formScroll: {
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  badgeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  mappingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  datePickerTriggerIcon: {
    fontSize: 22,
  },
  datePickerValueText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
  },
  datePickerHintText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presetButtonText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  calendarContainer: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarNavButton: {
    padding: 6,
  },
  calendarNavText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
    marginBottom: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  calendarCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  timePreviewText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});